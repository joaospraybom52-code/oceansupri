import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPapelObras, podeAdminObra } from '@/lib/utils/obras-access'
import UsuariosClient, { type UsuarioRow } from '@/components/obras-eng/UsuariosClient'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
    // Aba só do admin. A tabela tem RLS de admin e as ações conferem de novo no
    // servidor — isto aqui é a porta da frente.
    if (!podeAdminObra(await getPapelObras())) redirect('/obras-eng')

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from('usuarios_app')
        .select('id, nome, email, perfil, ativo, observacoes, criado_por, criado_em, desativado_por, desativado_em')
        .order('ativo', { ascending: false })
        .order('nome', { ascending: true })

    return <UsuariosClient usuariosIniciais={(data ?? []) as UsuarioRow[]} meuEmail={user?.email ?? ''} />
}
