import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'


export async function updateSession(request: NextRequest) {
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
        // Controle de acesso ao módulo Obras
        if (request.nextUrl.pathname.startsWith('/obras-eng')) {
            const { data: permissao } = await supabase
                .from('permissoes_obras')
                .select('email')
                .eq('email', user.email)
                .single()

            if (!permissao) {
                const url = request.nextUrl.clone()
                url.pathname = '/sem-acesso'
                return NextResponse.redirect(url)
            }
        }

        // Verifica se é visualizador (regra existente do Suprimentos)
        if (!request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/obras-eng')) {
            const { data: isVisualizador } = await supabase
                .from('visualizadores')
                .select('id')
                .eq('auth_user_id', user.id)
                .single()

            if (isVisualizador && request.nextUrl.pathname !== '/board' && !request.nextUrl.pathname.startsWith('/api') && request.nextUrl.pathname !== '/' && !request.nextUrl.pathname.startsWith('/sem-acesso')) {
                const url = request.nextUrl.clone()
                url.pathname = '/board'
                return NextResponse.redirect(url)
            }
        }
    }

    return supabaseResponse
}
