import { createServerSupabaseClient } from '@/lib/supabase/server'
import { paginarTudo } from '@/lib/supabase/paginar'
import {
    calcularDre, DRE_INICIO,
    type RecebidoRow, type VendaRecRow, type PagoInsumoRow, type ImpostoPagoRow,
} from '@/lib/utils/dre-gerencial'
import DreGerencialClient from '@/components/controle/DreGerencialClient'

export const dynamic = 'force-dynamic'

export default async function DreGerencialPage() {
    const supabase = await createServerSupabaseClient()

    // Recebido e vendas vêm INTEIROS (são poucas centenas de linhas): o rateio
    // do imposto usa o principal total da venda, que pode ter parcela antes de
    // 2026. O pago é filtrado no banco — é a tabela grande.
    const [recebido, vendas, pagoInsumo, impostosPagos] = await Promise.all([
        paginarTudo<RecebidoRow>(supabase, 'controle_recebido', 'obra_rec, num_vend, data_rec, tot_conf, tot_desc, tot_princ'),
        paginarTudo<VendaRecRow>(supabase, 'controle_vendasrecebidas', 'obra_vrec, num_vend, val_desconto_imposto_vrec'),
        paginarTudo<PagoInsumoRow>(supabase, 'controle_pago_insumo_cliente', 'obra, descrinsumo, data_movimento, vlr_at_pago',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { ajuste: (q: any) => q.gte('data_movimento', `${DRE_INICIO}-01`) }),
        paginarTudo<ImpostoPagoRow>(supabase, 'controle_impostos_pagos', 'item, cliente, data_movimento, valor'),
    ])

    const { meses, linhas } = calcularDre({ recebido, vendas, pagoInsumo, impostosPagos })

    return <DreGerencialClient meses={meses} linhas={linhas} />
}
