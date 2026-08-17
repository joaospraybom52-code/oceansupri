import { createServerSupabaseClient } from '@/lib/supabase/server'
import DreGerencialClient from '@/components/controle/DreGerencialClient'

export const dynamic = 'force-dynamic'

export interface MovRow {
    obra: string | null
    desc_obra: string | null
    descr_comp: string | null
    nominal: string | null
    fornecedor: string | null
    valor: number | null
    vencimento: string | null   // usada no filtro de período
    origem: string | null
}

// DRE Gerencial: monta a partir da movimentacao_financeira (razão do UAU nas 15
// contas do Fechamento Banco). O recorte por linha da DRE é feito no client,
// junto com os filtros de obra e período.
export default async function DreGerencialPage() {
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
    const movimentos: MovRow[] = []
    for (let from = 0; ; from += PAGE) {
        const { data: rows } = await supabase
            .from('movimentacao_financeira' as any)
            .select('obra, desc_obra, descr_comp, nominal, fornecedor, valor, vencimento, origem')
            .range(from, from + PAGE - 1)
        if (!rows || rows.length === 0) break
        movimentos.push(...(rows as unknown as MovRow[]))
        if (rows.length < PAGE) break
    }

    const { data: classificacao } = await supabase
        .from('dre_gerencial_classificacao' as any)
        .select('nominal, tipo')

    return (
        <DreGerencialClient
            movimentos={movimentos}
            classificacao={(classificacao as any) ?? []}
            podeEditar={podeEditar}
        />
    )
}
