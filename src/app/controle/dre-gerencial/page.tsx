import { createServerSupabaseClient } from '@/lib/supabase/server'
import { paginarTudo } from '@/lib/supabase/paginar'
import {
    calcularDre, DRE_INICIO,
    type RecebidoRow, type VendaRecRow, type PagoMesRow, type ImpostoPagoRow,
} from '@/lib/utils/dre-gerencial'
import DreGerencialClient from '@/components/controle/DreGerencialClient'

export const dynamic = 'force-dynamic'

export default async function DreGerencialPage() {
    const supabase = await createServerSupabaseClient()

    // Recebido e vendas vêm INTEIROS (são poucas centenas de linhas): o rateio
    // do imposto usa o principal total da venda, que pode ter parcela antes de
    // 2026. O PAGO vem somado por mês e categoria pela view — trazer as ~31 mil
    // linhas cruas e somar aqui foi o que fez os valores mudarem a cada F5.
    const [recebido, vendas, pagoMes, impostosPagos] = await Promise.all([
        paginarTudo<RecebidoRow>(supabase, 'controle_recebido', 'obra_rec, num_vend, data_rec, tot_conf, tot_desc, tot_princ'),
        paginarTudo<VendaRecRow>(supabase, 'controle_vendasrecebidas', 'obra_vrec, num_vend, val_desconto_imposto_vrec'),
        paginarTudo<PagoMesRow>(supabase, 'vw_dre_pago_mes', 'mes, categoria, valor', {
            ordem: ['mes', 'categoria'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ajuste: (q: any) => q.gte('mes', `${DRE_INICIO}-01`),
        }),
        paginarTudo<ImpostoPagoRow>(supabase, 'controle_impostos_pagos', 'item, cliente, data_movimento, valor'),
    ])

    const { meses, linhas } = calcularDre({ recebido, vendas, pagoInsumo: [], impostosPagos, pagoMes })

    return <DreGerencialClient meses={meses} linhas={linhas} />
}
