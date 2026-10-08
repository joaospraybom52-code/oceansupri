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

/**
 * Perfis (cadastro de usuários) que podem preencher a Linha de Base da Curva S.
 * Antes era uma lista de e-mails na própria página; agora segue o nível de
 * acesso, então basta cadastrar a pessoa como Planejamento.
 */
export const PERFIS_LINHA_BASE = ['admin', 'planejamento']

/** Pode cadastrar/alterar a Linha de Base da Curva S? */
export async function podeEditarLinhaBase(): Promise<boolean> {
    const papel = await getPapelObras()
    if (papel === 'admin') return true
    if (!podeCriarMedProg(papel)) return false // precisa ser ao menos editor no Obras

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return false
    // RLS deixa cada um ler a própria linha de usuarios_app.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from('usuarios_app')
        .select('perfil, ativo')
        .eq('email', user.email.toLowerCase())
        .maybeSingle()
    const u = data as { perfil?: string; ativo?: boolean } | null
    return !!u?.ativo && PERFIS_LINHA_BASE.includes(u?.perfil ?? '')
}
