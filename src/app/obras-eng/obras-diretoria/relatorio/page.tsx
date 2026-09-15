import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPapelObras, podeAdminObra } from '@/lib/utils/obras-access'
import { montarLinhasCusto, type LinhaCusto } from '@/lib/utils/custo'
import { OBRAS_DIRETORIA, agruparPorCliente, type VendaUau, type VinculoCliente } from '@/lib/utils/diretoria'
import RelatorioDiretoriaClient from './RelatorioDiretoriaClient'

export const dynamic = 'force-dynamic'

export default async function RelatorioDiretoriaPage() {
    // Mesma porta da aba: relatório da diretoria é só do admin.
    if (!podeAdminObra(await getPapelObras())) redirect('/obras-eng')

    const obra = OBRAS_DIRETORIA[0]
    const supabase = await createServerSupabaseClient()

    const [linhasRes, vendasRes, vinculosRes] = await Promise.all([
        supabase.from('custo_uau')
            .select('obra_plt, obra, item_plt, serv_plt, servico, insumo, ins_cins, unid_ins, valor_aprov, saldo_vlr_vinc, ordem, atualizado_em')
            .eq('obra_plt', obra)
            .order('ordem', { ascending: true }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('vendas_uau')
            .select('num_ven, origem, status_ven, cliente, valor_tot, data_ven')
            .eq('obra_ven', obra),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('diretoria_clientes')
            .select('item_plt, cliente')
            .eq('obra_plt', obra),
    ])

    const linhas = (linhasRes.data ?? []) as LinhaCusto[]
    const vendas = (vendasRes.data ?? []) as VendaUau[]
    const vinculos = (vinculosRes.data ?? []) as VinculoCliente[]

    // Monta no servidor: a folha do PDF só desenha.
    const { rows, atualizado } = montarLinhasCusto(linhas, [], obra)
    const resumo = agruparPorCliente(rows, vendas, vinculos)

    return (
        <RelatorioDiretoriaClient
            obraCodigo={obra}
            obraNome={linhas[0]?.obra || obra}
            atualizado={atualizado}
            rows={rows}
            resumo={resumo}
        />
    )
}
