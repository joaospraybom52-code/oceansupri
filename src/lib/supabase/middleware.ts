import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

        let user: { email?: string } | null = null
        try {
            const r = await comRetentativa(() => supabase.auth.getUser(), LIMITE_AUTH_MS, 'validar a sessão')
            user = r.data.user
        } catch (e) {
            return paginaDeErro(request, 'Não deu para validar sua sessão: ' + (e as Error).message + '. Tente recarregar a página.')
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
                        // maybeSingle: sem linha devolve null SEM erro, então dá
                        // para separar "não tem permissão" de "a consulta falhou".
                        const { data, error } = await comRetentativa(
                            () => supabase.from('permissoes_obras').select('papel').eq('email', email).maybeSingle(),
                            LIMITE_QUERY_MS, 'checar sua permissão no módulo Obras')
                        if (error) throw new Error(error.message)
                        papel = (data as { papel?: string } | null)?.papel ?? null
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
                        const { data, error } = await comRetentativa(
                            () => supabase.from('permissao_modulocontrole').select('email').eq('email', email).maybeSingle(),
                            LIMITE_QUERY_MS, 'checar sua permissão no módulo Controle')
                        if (error) throw new Error(error.message)
                        temPermissao = !!data
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
                        const { data } = await comRetentativa(
                            () => supabase.from('visualizadores').select('id').eq('email', email).maybeSingle(),
                            LIMITE_QUERY_MS, 'checar se você é visualizador')
                        ehVisualizador = !!data
                    }
                } catch {
                    // Falhou a checagem: segue como NÃO visualizador. É a regra
                    // menos restritiva das duas e não abre módulo nenhum — quem
                    // manda no acesso são os portões acima.
                    ehVisualizador = false
                }

                if (ehVisualizador && caminho !== '/board' && !caminho.startsWith('/api') && caminho !== '/' && !caminho.startsWith('/sem-acesso')) {
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
