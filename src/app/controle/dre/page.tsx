import { createServerSupabaseClient } from '@/lib/supabase/server'
import DreSedeClient from '@/components/controle/DreSedeClient'

export const dynamic = 'force-dynamic'

// DRE Sede (ADMCO), regime de caixa (só o pago):
//  L1 Margem de Contribuição Obras = Total Recebido Real x 6%
//  L2 Custos Variáveis / L3 Custos Fixos = pagos da ADMCO classificados
//     (dre_sede_classificacao; empréstimos/juros = ignorados)
//  L4 Resultado = L1 - L2 - L3 (+ % de equilíbrio quando negativo)
export default async function DreSedePage() {
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

    const PAGE = 1000

    // Recebido Real agregado por obra + mês (base da linha 1 e do drill por obra)
    const recMap = new Map<string, { obra: string; ym: string; valor: number }>()
    for (let from = 0; ; from += PAGE) {
        const { data: rows } = await supabase
            .from('controle_recebido')
            .select('obra_rec, data_rec, tot_conf')
            .range(from, from + PAGE - 1)
        if (!rows || rows.length === 0) break
        for (const r of rows as any[]) {
            const ym = (r.data_rec || '').slice(0, 7)
            if (!ym || !r.obra_rec) continue
            const k = `${r.obra_rec}|${ym}`
            const cur = recMap.get(k) ?? { obra: r.obra_rec, ym, valor: 0 }
            cur.valor += Number(r.tot_conf || 0)
            recMap.set(k, cur)
        }
        if (rows.length < PAGE) break
    }

    // Custos da ADMCO (insumo x cliente x mês, só o PAGO — regime de caixa)
    const custos: { descrinsumo: string | null; cliente: string | null; data_movimento: string | null; vlr_at_pago: number | null }[] = []
    for (let from = 0; ; from += PAGE) {
        const { data: rows } = await supabase
            .from('controle_pago_insumo_cliente')
            .select('descrinsumo, cliente, data_movimento, vlr_at_pago')
            .eq('obra', 'ADMCO')
            .range(from, from + PAGE - 1)
        if (!rows || rows.length === 0) break
        custos.push(...(rows as any[]))
        if (rows.length < PAGE) break
    }

    const { data: classificacao } = await supabase
        .from('dre_sede_classificacao' as any)
        .select('insumo, tipo')

    const { data: obras } = await supabase
        .from('obras')
        .select('codigo, nome')
        .eq('ativo', true)

    return (
        <DreSedeClient
            recebido={Array.from(recMap.values())}
            custos={custos}
            classificacao={(classificacao as any) ?? []}
            obras={(obras as any) ?? []}
            podeEditar={podeEditar}
        />
    )
}
