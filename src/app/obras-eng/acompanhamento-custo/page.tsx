import { createServerSupabaseClient } from '@/lib/supabase/server'
import { foraDaDiretoria } from '@/lib/utils/diretoria'
import AcompanhamentoCustoClient from './AcompanhamentoCustoClient'

export const dynamic = 'force-dynamic'

export default async function AcompanhamentoCustoPage() {
    const supabase = await createServerSupabaseClient()

    // As obras da diretoria (ES001) têm aba própria, restrita ao admin, e ficam
    // fora daqui — esta aba é de todo o módulo Obras.
    const semDiretoria = foraDaDiretoria()

    const { data: linhas } = await supabase
        .from('custo_uau')
        .select('obra_plt, obra, item_plt, serv_plt, servico, insumo, ins_cins, unid_ins, valor_aprov, saldo_vlr_vinc, ordem, atualizado_em')
        .not('obra_plt', 'in', semDiretoria)
        .order('obra_plt', { ascending: true })
        .order('ordem', { ascending: true })

    const { data: orcamento } = await supabase
        .from('custo_orcamento')
        .select('id, obra_plt, item_plt, insumo, valor_planejado')
        .not('obra_plt', 'in', semDiretoria)

    const { data: materiais } = await supabase
        .from('custo_materiais')
        .select('obra_plt, item_plt, ins_cins, material, valor')
        .not('obra_plt', 'in', semDiretoria)
        .order('valor', { ascending: false })

    return <AcompanhamentoCustoClient linhas={(linhas as any) ?? []} orcamento={(orcamento as any) ?? []} materiais={(materiais as any) ?? []} />
}
