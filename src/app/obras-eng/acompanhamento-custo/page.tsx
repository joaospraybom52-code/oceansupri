import { createServerSupabaseClient } from '@/lib/supabase/server'
import AcompanhamentoCustoClient from './AcompanhamentoCustoClient'

export const dynamic = 'force-dynamic'

export default async function AcompanhamentoCustoPage() {
    const supabase = await createServerSupabaseClient()

    const { data: linhas } = await supabase
        .from('custo_uau')
        .select('obra_plt, obra, item_plt, serv_plt, servico, insumo, ins_cins, unid_ins, valor_aprov, saldo_vlr_vinc, ordem, atualizado_em')
        .order('obra_plt', { ascending: true })
        .order('ordem', { ascending: true })

    const { data: orcamento } = await supabase
        .from('custo_orcamento')
        .select('id, obra_plt, item_plt, insumo, valor_planejado')

    const { data: materiais } = await supabase
        .from('custo_materiais')
        .select('obra_plt, item_plt, ins_cins, material, valor')
        .order('valor', { ascending: false })

    return <AcompanhamentoCustoClient linhas={(linhas as any) ?? []} orcamento={(orcamento as any) ?? []} materiais={(materiais as any) ?? []} />
}
