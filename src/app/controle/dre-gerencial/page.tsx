import { createServerSupabaseClient } from '@/lib/supabase/server'
import DreGerencialClient from '@/components/controle/DreGerencialClient'
import { paginarTudo } from '@/lib/supabase/paginar'

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

    // Tudo em paralelo. Antes eram 24 idas ao Supabase EM FILA (a
    // movimentacao_financeira sozinha são 22 páginas de 1000) — 11,8s medidos.
    const [perm, movimentos, classificacao, regrasLinha] = await Promise.all([
        (async () => {
            if (!user?.email) return null
            const { data } = await supabase
                .from('permissao_modulocontrole').select('pode_editar').eq('email', user.email).maybeSingle()
            return data as { pode_editar?: boolean } | null
        })(),
        paginarTudo<MovRow>(supabase, 'movimentacao_financeira',
            'obra, desc_obra, descr_comp, nominal, fornecedor, valor, vencimento, origem'),
        paginarTudo<{ nominal: string; tipo: string }>(supabase, 'dre_gerencial_classificacao', 'nominal, tipo'),
        // Regras manuais de linha da DRE (sobrepõem o recorte automático)
        paginarTudo<{ obra: string; descr_comp: string; nominal: string; linha: string }>(
            supabase, 'dre_gerencial_linha', 'obra, descr_comp, nominal, linha'),
    ])
    const podeEditar = perm?.pode_editar ?? false

    return (
        <DreGerencialClient
            movimentos={movimentos}
            classificacao={classificacao as any}
            regras={regrasLinha as any}
            podeEditar={podeEditar}
        />
    )
}
