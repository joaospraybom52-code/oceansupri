import { createServerSupabaseClient } from '@/lib/supabase/server'
import EmprestimosClient from '@/components/controle/EmprestimosClient'
import { paginarTudo } from '@/lib/supabase/paginar'

export const dynamic = 'force-dynamic'

export interface InsumoFinRow {
    obra: string | null
    descrinsumo: string | null
    cliente: string | null
    data_movimento: string | null
    vlr_at_pagar: number | null
    vlr_at_pago: number | null
}

// Aba Empréstimos, Juros, Tarifas e Consórcio.
// Mesma fonte da KPI'S (controle_pago_insumo_cliente), só que com o recorte
// oposto: aqui fica SÓ o financeiro, que saiu das medidas de obra.
export default async function EmprestimosPage() {
    const supabase = await createServerSupabaseClient()

    const [obrasRes, linhas] = await Promise.all([
        supabase.from('obras').select('codigo, nome').eq('ativo', true),
        paginarTudo<InsumoFinRow>(supabase, 'controle_pago_insumo_cliente',
            'obra, descrinsumo, cliente, data_movimento, vlr_at_pagar, vlr_at_pago'),
    ])

    return <EmprestimosClient obras={obrasRes.data ?? []} linhas={linhas} />
}
