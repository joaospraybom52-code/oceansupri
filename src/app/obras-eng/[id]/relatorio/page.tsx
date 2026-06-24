import { createServerSupabaseClient } from '@/lib/supabase/server'
import RelatorioClient from './RelatorioClient'
import { getPapelObras, podeCriarMedProg } from '@/lib/utils/obras-access'

export const dynamic = 'force-dynamic'

export default async function RelatorioPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data: obra } = await supabase.from('obras_eng').select('*').eq('id', id).single()

    const { data: programacoes } = await supabase
        .from('programacoes_semanais')
        .select('id, semana_referente_inicio, semana_referente_fim, status_envio, responsavel, ppc')
        .eq('obra_id', id)
        .order('semana_referente_inicio', { ascending: true })

    const progIds = (programacoes || []).map(p => p.id)

    let tarefas: any[] = []
    if (progIds.length > 0) {
        const { data } = await supabase.from('tarefas').select('*, itens_orcamento(codigo, descricao)').in('programacao_id', progIds)
        tarefas = data || []
    }

    const { data: restricoes } = await supabase.from('restricoes').select('*').eq('obra_id', id).order('created_at', { ascending: true })

    // 5W2H ligados às tarefas/restrições da obra
    let analises: any[] = []
    const tarefaIds = tarefas.map(t => t.id)
    const restricaoIds = (restricoes || []).map(r => r.id)
    if (tarefaIds.length > 0) {
        const { data } = await supabase.from('analises_5w2h' as any).select('*').in('tarefa_id', tarefaIds)
        if (data) analises = [...analises, ...data]
    }
    if (restricaoIds.length > 0) {
        const { data } = await supabase.from('analises_5w2h' as any).select('*').in('restricao_id', restricaoIds)
        if (data) { const ex = new Set(analises.map(a => a.id)); analises = [...analises, ...(data as any[]).filter(a => !ex.has(a.id))] }
    }

    const { data: curva } = await supabase.from('curva_s_semanas' as any).select('*').eq('obra_id', id).order('semana_ref', { ascending: true })
    const { data: histograma } = await supabase.from('histograma_semanas' as any).select('*').eq('obra_id', id).order('semana_ref', { ascending: true })
    const { data: relatorios } = await supabase.from('relatorio_semanal' as any).select('*').eq('obra_id', id)

    const podeEditar = podeCriarMedProg(await getPapelObras())

    return (
        <RelatorioClient
            obra={obra}
            programacoes={programacoes || []}
            tarefas={tarefas}
            restricoes={restricoes || []}
            analises={analises}
            curva={(curva as any[]) || []}
            histograma={(histograma as any[]) || []}
            relatorios={(relatorios as any[]) || []}
            podeEditar={podeEditar}
        />
    )
}
