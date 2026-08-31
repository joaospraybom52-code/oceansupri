import { createServerSupabaseClient } from '@/lib/supabase/server'
import EmprestimosClient from '@/components/controle/EmprestimosClient'
import { paginarTudo } from '@/lib/supabase/paginar'

export const dynamic = 'force-dynamic'

export interface InsumoFinRow {
    obra: string | null
    descrinsumo: string | null
    cliente: string | null
    mes: string | null          // 1º dia do mês do desembolso
    vlr_emissao: number | null  // StatusParc_Des = 1 (emissão de pagamento)
    vlr_pago: number | null     // StatusParc_Des = 2 (pago)
    qtd: number | null
}

// Aba Empréstimos, Juros, Tarifas e Consórcio.
// Fonte própria (emprestimos_encargos, worker sync-emprestimos): traz do UAU só
// os insumos financeiros, separados por status da parcela — emissão e pago. O
// "a pagar" em aberto (status 0) fica de fora, por decisão do usuário.
export default async function EmprestimosPage() {
    const supabase = await createServerSupabaseClient()

    const [obrasRes, linhas, atualizado] = await Promise.all([
        supabase.from('obras').select('codigo, nome').eq('ativo', true),
        paginarTudo<InsumoFinRow>(supabase, 'emprestimos_encargos',
            'obra, descrinsumo, cliente, mes, vlr_emissao, vlr_pago, qtd'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('emprestimos_encargos')
            .select('atualizado_em').order('atualizado_em', { ascending: false }).limit(1),
    ])

    return (
        <EmprestimosClient
            obras={obrasRes.data ?? []}
            linhas={linhas}
            atualizadoEm={atualizado?.data?.[0]?.atualizado_em ?? null}
        />
    )
}
