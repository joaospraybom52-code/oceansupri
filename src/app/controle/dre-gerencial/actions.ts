'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { paginarTudo } from '@/lib/supabase/paginar'
import {
    montarDetalhe, LINHAS_COM_DETALHE,
    type LinhaDetalhe, type RecebidoRow, type VendaRecRow, type PagoInsumoRow, type ImpostoPagoRow,
} from '@/lib/utils/dre-gerencial'

/** Último dia do mês YYYY-MM, para fechar o filtro no banco. */
const fimDoMes = (ym: string) => {
    const [a, m] = ym.split('-').map(Number)
    return `${a}-${String(m).padStart(2, '0')}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
}

/**
 * Detalhe de uma linha da DRE (obra, item, insumo, cliente e valor) nos meses
 * pedidos. Busca sob demanda: a página não carrega as ~32 mil linhas do pago só
 * para o caso de alguém clicar.
 */
export async function detalheDaLinha(n: number, meses: string[]): Promise<{ linhas: LinhaDetalhe[]; total: number }> {
    if (!LINHAS_COM_DETALHE.includes(n) || meses.length === 0) return { linhas: [], total: 0 }

    const ordenados = [...meses].sort()
    const de = `${ordenados[0]}-01`
    const ate = fimDoMes(ordenados[ordenados.length - 1])
    const supabase = await createServerSupabaseClient()

    const [recebido, vendas, pagoInsumo, impostosPagos] = await Promise.all([
        // Recebido e vendas vêm inteiros: o rateio do imposto precisa do principal
        // total da venda, que pode ter parcela fora do período.
        paginarTudo<RecebidoRow>(supabase, 'controle_recebido', 'obra_rec, num_vend, cliente, data_rec, tot_conf, tot_desc, tot_princ'),
        paginarTudo<VendaRecRow>(supabase, 'controle_vendasrecebidas', 'obra_vrec, num_vend, val_desconto_imposto_vrec'),
        paginarTudo<PagoInsumoRow>(supabase, 'controle_pago_insumo_cliente', 'obra, item, descrinsumo, cliente, data_movimento, vlr_at_pago',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { ajuste: (q: any) => q.gte('data_movimento', de).lte('data_movimento', ate) }),
        paginarTudo<ImpostoPagoRow>(supabase, 'controle_impostos_pagos', 'obra, item, cliente, data_movimento, valor',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { ajuste: (q: any) => q.gte('data_movimento', de).lte('data_movimento', ate) }),
    ])

    return montarDetalhe(n, { recebido, vendas, pagoInsumo, impostosPagos }, ordenados, recebido)
}
