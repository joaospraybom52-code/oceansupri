import { createServerSupabaseClient } from '@/lib/supabase/server'
import ProgramacaoGridClient from './ProgramacaoGridClient'

export const dynamic = 'force-dynamic'

export default async function ProgramacaoListPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const supabase = await createServerSupabaseClient()
        
        // Buscar programações da obra
        const { data: programacoes, error } = await supabase
            .from('programacoes_semanais')
            .select('*')
            .eq('obra_id', id)
            .order('semana_referente_inicio', { ascending: false })

        if (error) {
            throw new Error(error.message)
        }

        // Buscar detalhes da obra (previsão de início e término)
        const { data: obra } = await supabase
            .from('obras_eng')
            .select('previsao_inicio, previsao_termino')
            .eq('id', id)
            .single()

        return (
            <div>
                <ProgramacaoGridClient 
                    programacoes={(programacoes as any) || []} 
                    obraId={id} 
                    previsaoInicio={(obra as any)?.previsao_inicio}
                    previsaoTermino={(obra as any)?.previsao_termino}
                />
            </div>
        )
    } catch (err: any) {
        return (
            <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
                <h3 style={{ color: 'var(--accent-red)', marginBottom: '8px' }}>Erro ao carregar lista de programações</h3>
                <pre style={{ fontSize: '12px', color: 'var(--accent-red-light)', whiteSpace: 'pre-wrap' }}>
                    {err.message || String(err)}
                </pre>
            </div>
        )
    }
}
