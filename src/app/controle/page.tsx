import { createServerSupabaseClient } from '@/lib/supabase/server'
import ControleClient from '@/components/controle/ControleClient'

export const dynamic = 'force-dynamic'

export default async function ControlePage() {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    let podeEditar = false
    if (user?.email) {
        const { data: perm } = await supabase
            .from('permissao_modulocontrole')
            .select('pode_editar')
            .eq('email', user.email)
            .maybeSingle()
        podeEditar = perm?.pode_editar ?? false
    }

    const { data: obras } = await supabase
        .from('obras')
        .select('id, nome, codigo, cidade')
        .eq('ativo', true)
        .order('nome', { ascending: true })

    const { data: medicoes } = await supabase
        .from('controle_medicoes')
        .select('id, obra_id, valor_medicao, mes_recebimento, created_at, obra:obras(id, nome, codigo, cidade)')
        .order('mes_recebimento', { ascending: true })

    return (
        <ControleClient
            obras={obras ?? []}
            medicoesIniciais={(medicoes as any) ?? []}
            podeEditar={podeEditar}
        />
    )
}
