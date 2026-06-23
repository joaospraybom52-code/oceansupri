import { createServerSupabaseClient } from '@/lib/supabase/server'

export type PapelObras = 'viewer' | 'editor' | 'admin' | null

/** Papel do usuário logado no módulo Obras (null = sem acesso). */
export async function getPapelObras(): Promise<PapelObras> {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return null
    const { data } = await supabase
        .from('permissoes_obras')
        .select('papel')
        .eq('email', user.email)
        .maybeSingle()
    return ((data as { papel?: string } | null)?.papel as PapelObras) ?? null
}

export const podeCriarMedProg = (p: PapelObras) => p === 'editor' || p === 'admin'
export const podeAdminObra = (p: PapelObras) => p === 'admin'
