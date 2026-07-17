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
        .select('id, obra_id, valor_medicao, mes_recebimento, tipo, nota_fiscal, observacoes, percentual_recebido, mes_recebimento_real, iss_percentual, inss_percentual, created_at, obra:obras(id, nome, codigo, cidade)')
        .order('mes_recebimento', { ascending: true })

    // Comprometido por obra/mês (mesma medida da KPI'S: Despesas -> pago + a pagar;
    // DespSaida -> total_receita), agregado aqui pra não mandar a tabela inteira.
    // "pago" = Total Pago (vlr_at_pago das Despesas) + Controle Financeiro Saída
    // (total_receita das DespSaida) — mesma despesa do Balanço da Obra na KPI'S.
    // pagoDia = a MESMA medida "pago" por DIA (data_movimento) — Fluxo de Caixa Diário.
    const agg = new Map<string, { obra: string; ym: string; valor: number; pago: number }>()
    const pagoDia = new Map<string, { obra: string; data: string; valor: number }>()
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
        const { data: rows } = await supabase
            .from('controle_pago_apagar')
            .select('obra, data_movimento, tipo_controle, vlr_at_pago, vlr_at_pagar, total_receita')
            .range(from, from + PAGE - 1)
        if (!rows || rows.length === 0) break
        for (const r of rows as any[]) {
            const dia = (r.data_movimento || '').slice(0, 10)
            const ym = dia.slice(0, 7)
            if (!ym || !r.obra) continue
            // ImpostoRetido (Banco_Des 1010) fica de fora — a exclusão já é o desconto
            const valor = r.tipo_controle === 'Despesas'
                ? Number(r.vlr_at_pago || 0) + Number(r.vlr_at_pagar || 0)
                : r.tipo_controle === 'DespSaida' ? Number(r.total_receita || 0) : 0
            const pago = r.tipo_controle === 'Despesas' ? Number(r.vlr_at_pago || 0)
                : r.tipo_controle === 'DespSaida' ? Number(r.total_receita || 0) : 0
            if (!valor && !pago) continue
            const k = `${r.obra}|${ym}`
            const cur = agg.get(k) ?? { obra: r.obra, ym, valor: 0, pago: 0 }
            cur.valor += valor
            cur.pago += pago
            agg.set(k, cur)
            if (pago) {
                const kd = `${r.obra}|${dia}`
                const cd = pagoDia.get(kd) ?? { obra: r.obra, data: dia, valor: 0 }
                cd.valor += pago
                pagoDia.set(kd, cd)
            }
        }
        if (rows.length < PAGE) break
    }

    // Recebido por obra/DIA (medida Total Recebido Real: SUM(tot_conf) de
    // controle_recebido por data_rec) — Fluxo de Caixa Diário.
    const recDia = new Map<string, { obra: string; data: string; valor: number }>()
    for (let from = 0; ; from += PAGE) {
        const { data: rows } = await supabase
            .from('controle_recebido')
            .select('obra_rec, data_rec, tot_conf')
            .range(from, from + PAGE - 1)
        if (!rows || rows.length === 0) break
        for (const r of rows as any[]) {
            const dia = (r.data_rec || '').slice(0, 10)
            if (!dia || !r.obra_rec) continue
            const valor = Number(r.tot_conf || 0)
            if (!valor) continue
            const k = `${r.obra_rec}|${dia}`
            const cur = recDia.get(k) ?? { obra: r.obra_rec, data: dia, valor: 0 }
            cur.valor += valor
            recDia.set(k, cur)
        }
        if (rows.length < PAGE) break
    }

    return (
        <ControleClient
            obras={obras ?? []}
            medicoesIniciais={(medicoes as any) ?? []}
            podeEditar={podeEditar}
            comprometido={Array.from(agg.values())}
            fluxoRecebido={Array.from(recDia.values())}
            fluxoPago={Array.from(pagoDia.values())}
        />
    )
}
