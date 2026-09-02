import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { podeVerDashboard, ROTAS_DASHBOARD } from '@/lib/utils/visualizadores'

// =============================================================================
// Middleware de sessão + portão de acesso dos módulos.
//
// ATENÇÃO: toda chamada de rede daqui PRECISA de limite de tempo. O middleware
// roda na edge da Vercel com teto de 300s: sem timeout, um fetch pendurado no
// Supabase segura a requisição os 300s inteiros e o usuário vê a página girando
// pra sempre. Foi o que derrubou o /controle em 27/08/2026 ("Vercel Runtime
// Timeout Error: Task timed out after 300 seconds", no middleware).
// =============================================================================

/** Timeout por chamada. Curto de propósito: melhor errar rápido que pendurar. */
const LIMITE_AUTH_MS = 8000
const LIMITE_QUERY_MS = 5000

// ─────────────────────────────────────────────────────────────────────────────
// Cache em memória (medido em 27/08/2026)
//
// O Next faz PREFETCH de todo <Link> visível, e cada prefetch passa por aqui.
// Resultado real dos logs: 387 execuções do middleware para 13 páginas abertas
// — 30 execuções por página. Como cada execução fazia 2 idas ao Supabase
// (~250ms cada), toda troca de aba pagava esse pedágio e ainda martelava o
// Auth, que foi o que fez a coisa pendurar.
//
// O cache vive no escopo do módulo: a instância da edge é reaproveitada entre
// requisições, então a rajada de 30 prefetches paga UMA ida à rede e o resto
// sai da memória. Se a instância for nova, cai no caminho normal — é cache,
// não é fonte da verdade.
// ─────────────────────────────────────────────────────────────────────────────

/** TTL curto: mudança de permissão no Supabase vale em no máximo 1 minuto. */
const TTL_AUTH_MS = 30_000
const TTL_PERM_MS = 60_000
const MAX_ENTRADAS = 500

const memoria = new Map<string, { valor: unknown; expira: number }>()

function daMemoria<T>(chave: string): T | undefined {
    const e = memoria.get(chave)
    if (!e) return undefined
    if (e.expira < Date.now()) { memoria.delete(chave); return undefined }
    return e.valor as T
}

function paraMemoria(chave: string, valor: unknown, ttl: number) {
    // Poda simples: sem isso a instância acumula chave de sessão pra sempre.
    if (memoria.size >= MAX_ENTRADAS) {
        const agora = Date.now()
        for (const [k, v] of memoria) if (v.expira < agora) memoria.delete(k)
        if (memoria.size >= MAX_ENTRADAS) memoria.clear()
    }
    memoria.set(chave, { valor, expira: Date.now() + ttl })
}

/** Identidade da sessão para o cache: os cookies do Supabase mudam a cada refresh. */
function chaveSessao(request: NextRequest) {
    return request.cookies.getAll()
        .filter(c => c.name.startsWith('sb-'))
        .map(c => c.name + '=' + c.value)
        .join('|') || 'anon'
}

/**
 * Corta a espera de uma promise. Não cancela o fetch por baixo, mas devolve o
 * controle ao middleware para ele responder em vez de ficar preso.
 */
function comLimite<T>(p: PromiseLike<T>, ms: number, oQue: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>
    const estouro = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error('tempo esgotado ao ' + oQue + ' (' + ms + 'ms)')), ms)
    })
    return Promise.race([Promise.resolve(p), estouro]).finally(() => clearTimeout(timer)) as Promise<T>
}

/** Uma tentativa extra: a maioria das falhas do Supabase é blip de rede. */
async function comRetentativa<T>(fn: () => PromiseLike<T>, ms: number, oQue: string): Promise<T> {
    try {
        return await comLimite(fn(), ms, oQue)
    } catch {
        return await comLimite(fn(), ms, oQue + ' (2a tentativa)')
    }
}

/** Manda para a tela de erro com a causa — nunca deixa a requisição pendurada. */
function paginaDeErro(request: NextRequest, msg: string) {
    const url = request.nextUrl.clone()
    url.pathname = '/erro-middleware'
    url.search = ''
    url.searchParams.set('msg', msg)
    return NextResponse.redirect(url)
}

export async function updateSession(request: NextRequest) {
    const caminho = request.nextUrl.pathname

    // A própria tela de erro é pública: sem isso, um erro que se repete vira
    // laço de redirecionamento (erro -> /erro-middleware -> erro -> ...).
    if (caminho.startsWith('/erro-middleware')) return NextResponse.next({ request })

    try {
        let supabaseResponse = NextResponse.next({ request })

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        )
                        supabaseResponse = NextResponse.next({ request })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const sessao = chaveSessao(request)

        // getUser() vai na rede e é o que renova o token. Com o cache, a rajada
        // de prefetches paga essa ida UMA vez a cada 30s em vez de 30 vezes.
        let user: { email?: string } | null = null
        const userCache = daMemoria<{ email?: string } | null>('u:' + sessao)
        if (userCache !== undefined) {
            user = userCache
        } else {
            try {
                const r = await comRetentativa(() => supabase.auth.getUser(), LIMITE_AUTH_MS, 'validar a sessão')
                user = r.data.user
                paraMemoria('u:' + sessao, user, TTL_AUTH_MS)
            } catch (e) {
                return paginaDeErro(request, 'Não deu para validar sua sessão: ' + (e as Error).message + '. Tente recarregar a página.')
            }
        }

        // Rotas públicas: login, registro, launcher (/), sem-acesso
        const isPublicRoute =
            caminho.startsWith('/login') ||
            caminho.startsWith('/registro') ||
            caminho.startsWith('/sem-acesso') ||
            caminho === '/'

        // Se não está logado e não é rota pública -> redireciona para login
        if (!user && !isPublicRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        if (user) {
            const email = user.email
            const semAcesso = () => {
                const url = request.nextUrl.clone()
                url.pathname = '/sem-acesso'
                return NextResponse.redirect(url)
            }

            // Controle de acesso ao módulo Obras (com papel: viewer/editor/admin)
            if (caminho.startsWith('/obras-eng')) {
                let papel: string | null = null
                try {
                    if (email) {
                        const chave = 'obras:' + email
                        const cache = daMemoria<string | null>(chave)
                        if (cache !== undefined) {
                            papel = cache
                        } else {
                            // maybeSingle: sem linha devolve null SEM erro, então dá
                            // para separar "não tem permissão" de "a consulta falhou".
                            const { data, error } = await comRetentativa(
                                () => supabase.from('permissoes_obras').select('papel').eq('email', email).maybeSingle(),
                                LIMITE_QUERY_MS, 'checar sua permissão no módulo Obras')
                            if (error) throw new Error(error.message)
                            papel = (data as { papel?: string } | null)?.papel ?? null
                            paraMemoria(chave, papel, TTL_PERM_MS)
                        }
                    }
                } catch (e) {
                    return paginaDeErro(request, 'Não deu para checar sua permissão no módulo Obras: ' + (e as Error).message + '. Tente recarregar a página.')
                }

                if (!papel) return semAcesso()

                const ehNovaObra = caminho === '/obras-eng/nova'
                const ehEditarObra = caminho.endsWith('/editar')
                const ehCriarMedicao = caminho.endsWith('/medicao/nova')
                const ehCriarProgramacao = caminho.endsWith('/programacao/nova')

                const podeAdminObra = papel === 'admin'                          // criar/editar/excluir obra
                const podeCriarMedProg = papel === 'editor' || papel === 'admin' // medição e programação

                if ((ehNovaObra || ehEditarObra) && !podeAdminObra) return semAcesso()
                if ((ehCriarMedicao || ehCriarProgramacao) && !podeCriarMedProg) return semAcesso()
            }

            // Controle de acesso ao módulo Controle
            if (caminho.startsWith('/controle')) {
                let temPermissao = false
                try {
                    if (email) {
                        const chave = 'controle:' + email
                        const cache = daMemoria<boolean>(chave)
                        if (cache !== undefined) {
                            temPermissao = cache
                        } else {
                            const { data, error } = await comRetentativa(
                                () => supabase.from('permissao_modulocontrole').select('email').eq('email', email).maybeSingle(),
                                LIMITE_QUERY_MS, 'checar sua permissão no módulo Controle')
                            if (error) throw new Error(error.message)
                            temPermissao = !!data
                            paraMemoria(chave, temPermissao, TTL_PERM_MS)
                        }
                    }
                } catch (e) {
                    return paginaDeErro(request, 'Não deu para checar sua permissão no módulo Controle: ' + (e as Error).message + '. Tente recarregar a página.')
                }

                if (!temPermissao) return semAcesso()
            }

            // Verifica se é visualizador (regra existente do Suprimentos)
            if (!caminho.startsWith('/login') && !caminho.startsWith('/obras-eng') && !caminho.startsWith('/controle')) {
                let ehVisualizador = false
                try {
                    if (email) {
                        const chave = 'visu:' + email
                        const cache = daMemoria<boolean>(chave)
                        if (cache !== undefined) {
                            ehVisualizador = cache
                        } else {
                            const { data } = await comRetentativa(
                                () => supabase.from('visualizadores').select('id').eq('email', email).maybeSingle(),
                                LIMITE_QUERY_MS, 'checar se você é visualizador')
                            ehVisualizador = !!data
                            paraMemoria(chave, ehVisualizador, TTL_PERM_MS)
                        }
                    }
                } catch {
                    // Falhou a checagem: segue como NÃO visualizador. É a regra
                    // menos restritiva das duas e não abre módulo nenhum — quem
                    // manda no acesso são os portões acima.
                    ehVisualizador = false
                }

                // Alguns visualizadores também podem ver o Dashboard de KPIs.
                // A lista mora em lib/utils/visualizadores para não divergir da
                // Sidebar — era só lá, então o link aparecia e o middleware
                // barrava, jogando o usuário de volta no Board.
                const liberadoDashboard = podeVerDashboard(email)
                    && ROTAS_DASHBOARD.some(r => caminho.startsWith(r))

                if (ehVisualizador && !liberadoDashboard
                    && caminho !== '/board' && !caminho.startsWith('/api') && caminho !== '/' && !caminho.startsWith('/sem-acesso')) {
                    const url = request.nextUrl.clone()
                    url.pathname = '/board'
                    return NextResponse.redirect(url)
                }
            }
        }

        return supabaseResponse
    } catch (err) {
        return paginaDeErro(request, err instanceof Error ? err.message : String(err))
    }
}
