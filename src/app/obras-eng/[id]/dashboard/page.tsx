import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BarChart3 } from 'lucide-react'

export default async function ObraDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: itens } = await supabase
        .from('itens_orcamento')
        .select('valor_total_orcado')
        .eq('obra_id', id)

    const totalOrcamento = itens?.reduce((acc, item) => acc + (item.valor_total_orcado || 0), 0) || 0

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)' }}>
                            <BarChart3 size={24} color="var(--accent-blue)" />
                        </div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Orçamento Total</h3>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 800 }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrcamento)}
                    </p>
                </div>
                
                {/* Outros cards de KPI virão aqui depois */}
            </div>
        </div>
    )
}
