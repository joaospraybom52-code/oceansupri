import { createServerSupabaseClient } from '@/lib/supabase/server'
import KpisClient from '@/components/controle/KpisClient'

export const dynamic = 'force-dynamic'

interface RecebidoRow {
    obra_rec: string | null
    tot_conf: number | null
    data_rec: string | null
    tot_desc: number | null
    tot_princ: number | null
}

interface VendasRecRow {
    val_provisao_curto_vrec: number | null
    val_desconto_imposto_vrec: number | null
}

interface AReceberRow {
    obra: string | null
    data_prc: string | null
    num_parc_ger: string | null
    val_provisao_curto_ven: number | null
    val_desconto_imposto_ven: number | null
    valor_prc: number | null
    data_fim_contrato_ven: string | null
    hist_lanc_ven: string | null
    data_ven: string | null
}

interface VgvRow {
    codigo_obra: string | null
    ano: number | null
    valor_venda: number | null
}

interface PagoICRow {
    descrinsumo: string | null
    cliente: string | null
    data_movimento: string | null
    vlr_at_pagar: number | null
    vlr_at_pago: number | null
}

interface PagoRow {
    obra: string | null
    data_movimento: string | null
    tipo_controle: string | null
    vlr_at_pago: number | null
    vlr_at_pagar: number | null
    vlr_comp: number | null
    total_receita: number | null
}

// Busca todas as linhas de uma tabela. Pega a 1ª página com a contagem total e
// depois baixa as demais páginas EM PARALELO (em vez de uma de cada vez).
async function fetchAll<T>(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    table: string,
    columns: string,
): Promise<T[]> {
    const PAGE = 1000
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any
    const first = await client.from(table).select(columns, { count: 'exact' }).range(0, PAGE - 1)
    if (first.error || !first.data) return []
    const out: T[] = [...(first.data as T[])]
    const total: number = first.count ?? out.length
    if (out.length >= total) return out
    // demais páginas em paralelo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promises: Promise<any>[] = []
    for (let from = PAGE; from < total; from += PAGE) {
        promises.push(client.from(table).select(columns).range(from, from + PAGE - 1))
    }
    const results = await Promise.all(promises)
    for (const r of results) if (r.data) out.push(...(r.data as T[]))
    return out
}

export default async function KpisPage() {
    const supabase = await createServerSupabaseClient()

    // Obras + tabelas-fato espelhadas do UAU — tudo em paralelo.
    const [obrasRes, recebido, pago, vendasrec, areceber, vgv, pagoIC] = await Promise.all([
        supabase.from('obras').select('id, nome, codigo, cidade').eq('ativo', true).order('nome', { ascending: true }),
        fetchAll<RecebidoRow>(supabase, 'controle_recebido', 'obra_rec, tot_conf, data_rec, tot_desc, tot_princ'),
        fetchAll<PagoRow>(supabase, 'controle_pago_apagar', 'obra, data_movimento, tipo_controle, vlr_at_pago, vlr_at_pagar, vlr_comp, total_receita'),
        fetchAll<VendasRecRow>(supabase, 'controle_vendasrecebidas', 'val_provisao_curto_vrec, val_desconto_imposto_vrec'),
        fetchAll<AReceberRow>(supabase, 'controle_a_receber', 'obra, data_prc, num_parc_ger, val_provisao_curto_ven, val_desconto_imposto_ven, valor_prc, data_fim_contrato_ven, hist_lanc_ven, data_ven'),
        fetchAll<VgvRow>(supabase, 'controle_vgv', 'codigo_obra, ano, valor_venda'),
        fetchAll<PagoICRow>(supabase, 'controle_pago_insumo_cliente', 'descrinsumo, cliente, data_movimento, vlr_at_pagar, vlr_at_pago'),
    ])
    const obras = obrasRes.data

    return (
        <KpisClient obras={obras ?? []} recebido={recebido} pago={pago} vendasrec={vendasrec} areceber={areceber} vgv={vgv} pagoIC={pagoIC} />
    )
}
