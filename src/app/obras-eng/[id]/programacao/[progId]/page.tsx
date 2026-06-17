import { createServerSupabaseClient } from '@/lib/supabase/server'
import ProgramacaoSemanalClient from '@/components/obras/ProgramacaoSemanalClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProgramacaoDetalhePage({ params }: { params: Promise<{ id: string, progId: string }> }) {
    try {
        const { id, progId } = await params
        const supabase = await createServerSupabaseClient()

        // 1. Busca a programação em si
        const { data: programacao, error: progError } = await supabase
            .from('programacoes_semanais')
            .select('*')
            .eq('id', progId)
            .single()

        if (progError || !programacao) {
            redirect(`/obras-eng/${id}/programacao`)
        }

        // 2. Busca as tarefas
        const { data: tarefas } = await supabase
            .from('tarefas')
            .select(`
                *,
                itens_orcamento ( descricao, codigo )
            `)
            .eq('programacao_id', progId)
            .order('created_at', { ascending: true })

        // 3. Busca restrições
        const { data: restricoes } = await supabase
            .from('restricoes')
            .select('*')
            .eq('programacao_id', progId)
            .order('created_at', { ascending: true })

        // 4. Busca os 5 porquês (apenas aqueles ligados a essa programação via tarefas ou restrições)
        const tarefaIds = tarefas?.map(t => t.id) || []
        const restricaoIds = restricoes?.map(r => r.id) || []
        
        // Fazer duas queries para 5 porquês e juntar (se houver IDs)
        let analises: any[] = []
        if (tarefaIds.length > 0) {
            const { data: analisesTarefas } = await supabase
                .from('analises_5porques')
                .select('*')
                .in('tarefa_id', tarefaIds)
            if (analisesTarefas) analises = [...analises, ...analisesTarefas]
        }
        if (restricaoIds.length > 0) {
            const { data: analisesRest } = await supabase
                .from('analises_5porques')
                .select('*')
                .in('restricao_id', restricaoIds)
            if (analisesRest) {
                // Remove duplicatas caso algo bizarro aconteça
                const existingIds = new Set(analises.map(a => a.id))
                analises = [...analises, ...analisesRest.filter(a => !existingIds.has(a.id))]
            }
        }

        // 5. Busca itens do orçamento da obra para usar nos selects (opcional, mas bom ter)
        const { data: itensOrcamento } = await supabase
            .from('itens_orcamento')
            .select('id, descricao, codigo')
            .eq('obra_id', id)

        return (
            <ProgramacaoSemanalClient 
                obraId={id}
                programacao={programacao}
                initialTarefas={tarefas || []}
                initialRestricoes={restricoes || []}
                initialAnalises={analises}
                itensOrcamento={itensOrcamento || []}
            />
        )
    } catch (err: any) {
        return (
            <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
                <h3 style={{ color: 'var(--accent-red)', marginBottom: '8px' }}>Erro ao carregar detalhes da programação</h3>
                <pre style={{ fontSize: '12px', color: 'var(--accent-red-light)', whiteSpace: 'pre-wrap' }}>
                    {err.message || String(err)}
                </pre>
            </div>
        )
    }
}
