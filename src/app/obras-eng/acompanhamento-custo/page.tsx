import { createServerSupabaseClient } from '@/lib/supabase/server'
import AcompanhamentoCustoClient from './AcompanhamentoCustoClient'

export const dynamic = 'force-dynamic'

export default async function AcompanhamentoCustoPage() {
    const supabase = await createServerSupabaseClient()

    const { data: linhas } = await supabase
        .from('custo_uau')
        .select('obra_plt, obra, item_plt, serv_plt, servico, insumo, unid_ins, valor_planej, valor_aprov, saldo_vlr_vinc, ordem, atualizado_em')
        .order('obra_plt', { ascending: true })
        .order('ordem', { ascending: true })

    return <AcompanhamentoCustoClient linhas={(linhas as any) ?? []} />
}
