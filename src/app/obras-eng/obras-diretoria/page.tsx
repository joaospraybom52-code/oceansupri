import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPapelObras, podeAdminObra } from '@/lib/utils/obras-access'
import { OBRAS_DIRETORIA } from '@/lib/utils/diretoria'
import ObrasDiretoriaClient from '@/components/obras-eng/ObrasDiretoriaClient'

export const dynamic = 'force-dynamic'

export default async function ObrasDiretoriaPage() {
    // Aba restrita à diretoria: quem não é admin no módulo Obras nem vê a página.
    // As tabelas também têm RLS de admin — isto aqui é a porta, não a fechadura.
    if (!podeAdminObra(await getPapelObras())) redirect('/obras-eng')

    const obra = OBRAS_DIRETORIA[0]
    const supabase = await createServerSupabaseClient()

    const [linhasRes, materiaisRes, vendasRes, vinculosRes] = await Promise.all([
        supabase.from('custo_uau')
            .select('obra_plt, obra, item_plt, serv_plt, servico, insumo, ins_cins, unid_ins, valor_aprov, saldo_vlr_vinc, ordem, atualizado_em')
            .eq('obra_plt', obra)
            .order('ordem', { ascending: true }),
        supabase.from('custo_materiais')
            .select('obra_plt, item_plt, ins_cins, material, valor')
            .eq('obra_plt', obra)
            .order('valor', { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('vendas_uau')
            .select('num_ven, origem, status_ven, cliente, valor_tot, data_ven')
            .eq('obra_ven', obra),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('diretoria_clientes')
            .select('item_plt, cliente')
            .eq('obra_plt', obra),
    ])

    return (
        <ObrasDiretoriaClient
            obra={obra}
            /* eslint-disable @typescript-eslint/no-explicit-any */
            linhas={(linhasRes.data as any) ?? []}
            materiais={(materiaisRes.data as any) ?? []}
            vendas={(vendasRes.data as any) ?? []}
            vinculos={(vinculosRes.data as any) ?? []}
        />
    )
}
