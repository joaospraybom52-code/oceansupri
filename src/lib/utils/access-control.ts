import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Verifica se o email tem acesso ao módulo Obras.
 * Lê a variável de ambiente OBRAS_ALLOWED_EMAILS (lista separada por vírgula).
 * Comparação case-insensitive.
 */
export function checkObrasAccess(email: string): boolean {
    const allowedRaw = process.env.OBRAS_ALLOWED_EMAILS || ''
    const allowedEmails = allowedRaw
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)

    return allowedEmails.includes(email.toLowerCase())
}

/**
 * Verifica acesso ao módulo Obras para o usuário autenticado no server-side.
 * Retorna { allowed, email, userId } ou { allowed: false } se não autenticado.
 */
export async function checkObrasAccessServer(): Promise<{
    allowed: boolean
    email?: string
    userId?: string
}> {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
        return { allowed: false }
    }

    return {
        allowed: checkObrasAccess(user.email),
        email: user.email,
        userId: user.id,
    }
}
