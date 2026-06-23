import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'


export async function updateSession(request: NextRequest) {
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

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Rotas públicas: login, registro, launcher (/), sem-acesso
    const isPublicRoute =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/registro') ||
        request.nextUrl.pathname.startsWith('/sem-acesso') ||
        request.nextUrl.pathname === '/'

    // Se não está logado e não é rota pública → redireciona para login
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user) {
        // Controle de acesso ao módulo Obras (com papel: viewer/editor/admin)
        if (request.nextUrl.pathname.startsWith('/obras-eng')) {
            let papel: string | null = null
            try {
                if (user.email) {
                    const { data } = await supabase
                        .from('permissoes_obras')
                        .select('papel')
                        .eq('email', user.email)
                        .single()
                    papel = (data as { papel?: string } | null)?.papel ?? null
                }
            } catch (err) {
                console.error('Middleware check access error:', err)
            }

            const url = request.nextUrl.clone()
            url.pathname = '/sem-acesso'

            if (!papel) return NextResponse.redirect(url)

            const p = request.nextUrl.pathname
            const ehNovaObra = p === '/obras-eng/nova'
            const ehEditarObra = p.endsWith('/editar')
            const ehCriarMedicao = p.endsWith('/medicao/nova')
            const ehCriarProgramacao = p.endsWith('/programacao/nova')

            const podeAdminObra = papel === 'admin'                    // criar/editar/excluir obra
            const podeCriarMedProg = papel === 'editor' || papel === 'admin' // medição e programação

            if ((ehNovaObra || ehEditarObra) && !podeAdminObra) return NextResponse.redirect(url)
            if ((ehCriarMedicao || ehCriarProgramacao) && !podeCriarMedProg) return NextResponse.redirect(url)
        }

        // Controle de acesso ao módulo Controle
        if (request.nextUrl.pathname.startsWith('/controle')) {
            let permissaoControle = null
            try {
                if (user.email) {
                    const { data } = await supabase
                        .from('permissao_modulocontrole')
                        .select('email')
                        .eq('email', user.email)
                        .single()
                    permissaoControle = data
                }
            } catch (err) {
                console.error('Middleware check access (controle) error:', err)
            }

            if (!permissaoControle) {
                const url = request.nextUrl.clone()
                url.pathname = '/sem-acesso'
                return NextResponse.redirect(url)
            }
        }

        // Verifica se é visualizador (regra existente do Suprimentos)
        if (!request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/obras-eng') && !request.nextUrl.pathname.startsWith('/controle')) {
            const { data: isVisualizador } = await supabase
                .from('visualizadores')
                .select('id')
                .eq('email', user.email)
                .single()

            if (isVisualizador && request.nextUrl.pathname !== '/board' && !request.nextUrl.pathname.startsWith('/api') && request.nextUrl.pathname !== '/' && !request.nextUrl.pathname.startsWith('/sem-acesso')) {
                const url = request.nextUrl.clone()
                url.pathname = '/board'
                return NextResponse.redirect(url)
            }
        }
    }

        return supabaseResponse
    } catch (err: any) {
        const url = request.nextUrl.clone()
        url.pathname = '/erro-middleware'
        url.searchParams.set('msg', err.message || String(err))
        return NextResponse.redirect(url)
    }
}
