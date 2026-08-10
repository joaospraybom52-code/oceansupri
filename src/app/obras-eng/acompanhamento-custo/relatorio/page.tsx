import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { montarLinhasCusto, totaisDaObra, type LinhaCusto, type OrcamentoCusto } from '@/lib/utils/custo'
import RelatorioCustoClient from './RelatorioCustoClient'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'engjoao@constrowins.eng.br'

/**
 * Busca TODAS as linhas paginando. O PostgREST corta em 1000 por requisição —
 * sem isso, uma obra com muito lançamento no contas a pagar teria o Total Pago
 * silenciosamente subestimado no relatório.
 */
async function buscarTudo<T>(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    tabela: string,
    colunas: string,
    filtro?: { coluna: string; valor: string },
): Promise<T[]> {
    const PAGE = 1000
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any
    const out: T[] = []
    for (let from = 0; ; from += PAGE) {
        let q = client.from(tabela).select(colunas).range(from, from + PAGE - 1)
        if (filtro) q = q.eq(filtro.coluna, filtro.valor)
        const { data, error } = await q
        if (error || !data || data.length === 0) break
        out.push(...(data as T[]))
        if (data.length < PAGE) break
    }
    return out
}

export default async function RelatorioCustoPage({
    searchParams,
}: {
    searchParams: Promise<{ obra?: string; obras?: string }>
}) {
    const sp = await searchParams
    const supabase = await createServerSupabaseClient()

    // O botão só aparece para o admin, mas a rota também se protege sozinha.
    const { data: { user } } = await supabase.auth.getUser()
    if ((user?.email || '').toLowerCase() !== ADMIN_EMAIL) redirect('/sem-acesso')

    // Aceita uma obra (?obra=X, formato antigo) ou várias (?obras=A,B,C).
    const codigos = Array.from(new Set(
        (sp.obras ? sp.obras.split(',') : [sp.obra ?? ''])
            .map(c => c.trim()).filter(Boolean),
    ))
    if (codigos.length === 0) redirect('/obras-eng/acompanhamento-custo')

    // Vendas não dependem da obra (o casamento é por valor) — busca uma vez só.
    const vendas = await buscarTudo<{ val_provisao_curto_vrec: number | null; val_desconto_imposto_vrec: number | null }>(
        supabase, 'controle_vendasrecebidas', 'val_provisao_curto_vrec, val_desconto_imposto_vrec')

    const relatorios = await Promise.all(codigos.map(obra => montarRelatorio(supabase, obra, vendas)))

    return <RelatorioCustoClient relatorios={relatorios.filter(r => r.rows.length > 0)} />
}

async function montarRelatorio(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    obra: string,
    vendas: { val_provisao_curto_vrec: number | null; val_desconto_imposto_vrec: number | null }[],
) {
    const [linhasRes, orcRes, recebido, pago, areceber, vgvRows] = await Promise.all([
        supabase.from('custo_uau')
            .select('obra_plt, obra, item_plt, serv_plt, servico, insumo, ins_cins, unid_ins, valor_aprov, saldo_vlr_vinc, ordem, atualizado_em')
            .eq('obra_plt', obra).order('ordem', { ascending: true }),
        supabase.from('custo_orcamento').select('id, obra_plt, item_plt, insumo, valor_planejado').eq('obra_plt', obra),
        buscarTudo<{ tot_conf: number | null; tot_desc: number | null; tot_princ: number | null }>(
            supabase, 'controle_recebido', 'tot_conf, tot_desc, tot_princ', { coluna: 'obra_rec', valor: obra }),
        buscarTudo<{ tipo_controle: string | null; vlr_at_pago: number | null; total_receita: number | null }>(
            supabase, 'controle_pago_apagar', 'tipo_controle, vlr_at_pago, total_receita', { coluna: 'obra', valor: obra }),
        buscarTudo<{ num_parc_ger: string | null; val_provisao_curto_ven: number | null; val_desconto_imposto_ven: number | null }>(
            supabase, 'controle_a_receber', 'num_parc_ger, val_provisao_curto_ven, val_desconto_imposto_ven', { coluna: 'obra', valor: obra }),
        buscarTudo<{ valor_venda: number | null }>(
            supabase, 'controle_vgv', 'valor_venda', { coluna: 'codigo_obra', valor: obra }),
    ])

    const linhas = (linhasRes.data ?? []) as unknown as LinhaCusto[]
    const orcamento = (orcRes.data ?? []) as unknown as OrcamentoCusto[]
    const { rows, atualizado } = montarLinhasCusto(linhas, orcamento, obra)
    const totais = totaisDaObra(rows)

    // ── Medidas do módulo Controle, com as MESMAS definições da aba KPI'S,
    //    aqui sem filtro de período: o acompanhamento de custo é acumulado.

    // Total Recebido Real = SUM(TotConf)
    const totalRecebidoReal = recebido.reduce((s, r) => s + Number(r.tot_conf || 0), 0)

    // Valor Recebido Bruto = (SUM(TotConf) + SUM(TotDesc)) + desconto de imposto das
    // vendas cujo ValProvisaoCurto casa (por valor) com algum TotPrinc do recebido.
    const setTotPrinc = new Set(recebido.map(r => Number(r.tot_princ || 0).toFixed(2)))
    const valorRecebidoBruto = recebido.reduce((s, r) => s + Number(r.tot_conf || 0) + Number(r.tot_desc || 0), 0)
        + vendas.filter(v => setTotPrinc.has(Number(v.val_provisao_curto_vrec || 0).toFixed(2)))
            .reduce((s, v) => s + Number(v.val_desconto_imposto_vrec || 0), 0)

    // Total Pago = SUM(VlrAtPago) das Despesas · Controle Financeiro Saída = SUM(TotalReceita) das DespSaida
    const totalPago = pago.filter(p => p.tipo_controle === 'Despesas').reduce((s, p) => s + Number(p.vlr_at_pago || 0), 0)
    const controleFinanceiroSaida = pago.filter(p => p.tipo_controle === 'DespSaida').reduce((s, p) => s + Number(p.total_receita || 0), 0)

    // Faturado a Receber = SUM(ValProvisaoCurto_Ven + ValDescontoImposto_ven) onde NumParcGer = '1'
    const faturadoAReceber = areceber.filter(a => a.num_parc_ger === '1')
        .reduce((s, a) => s + Number(a.val_provisao_curto_ven || 0) + Number(a.val_desconto_imposto_ven || 0), 0)

    const vgv = vgvRows.reduce((s, v) => s + Number(v.valor_venda || 0), 0)

    return {
        obraCodigo: obra,
        obraNome: linhas[0]?.obra ?? obra,
        atualizado,
        rows,
        totais,
        balanco: { receita: totalRecebidoReal, despesa: totalPago + controleFinanceiroSaida },
        evolucao: { vgv, medido: valorRecebidoBruto, faturado: faturadoAReceber },
    }
}
