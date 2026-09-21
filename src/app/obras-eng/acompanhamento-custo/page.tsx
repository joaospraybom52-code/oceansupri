import { createServerSupabaseClient } from '@/lib/supabase/server'
import { paginarTudo } from '@/lib/supabase/paginar'
import { foraDaDiretoria } from '@/lib/utils/diretoria'
import AcompanhamentoCustoClient from './AcompanhamentoCustoClient'

export const dynamic = 'force-dynamic'

export default async function AcompanhamentoCustoPage() {
    const supabase = await createServerSupabaseClient()

    // As obras da diretoria (ES001) têm aba própria, restrita ao admin, e ficam
    // fora daqui — esta aba é de todo o módulo Obras.
    const semDiretoria = foraDaDiretoria()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const semObrasDiretoria = (q: any) => q.not('obra_plt', 'in', semDiretoria)

    // Tudo paginado: o banco entrega no máximo 1000 linhas por consulta. Os
    // materiais já passam de 1.800 e, sem paginar, a lista era cortada nos menores
    // valores — o painel "Materiais do insumo" somava menos que a coluna Custo
    // (NES14, 01.02.03: R$ 4.108,73 de R$ 5.392,97; corrigido em 21/09/2026).
    const [linhas, orcamento, materiais] = await Promise.all([
        paginarTudo(supabase, 'custo_uau',
            'obra_plt, obra, item_plt, serv_plt, servico, insumo, ins_cins, unid_ins, valor_aprov, saldo_vlr_vinc, ordem, atualizado_em',
            // A ordem da planilha (obra + ordem) é o que monta a hierarquia na tela.
            { ajuste: semObrasDiretoria, ordem: ['obra_plt', 'ordem'] }),
        paginarTudo(supabase, 'custo_orcamento', 'id, obra_plt, item_plt, insumo, valor_planejado',
            { ajuste: semObrasDiretoria }),
        paginarTudo(supabase, 'custo_materiais', 'obra_plt, item_plt, ins_cins, material, valor',
            { ajuste: semObrasDiretoria }),
    ])

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return <AcompanhamentoCustoClient linhas={linhas as any} orcamento={orcamento as any} materiais={materiais as any} />
}
