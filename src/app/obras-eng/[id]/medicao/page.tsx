import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Plus, Ruler } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MedicoesListPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    // Buscar medições da obra
    const { data: medicoes } = await supabase
        .from('medicoes')
        .select('*')
        .eq('obra_id', id)
        .order('periodo_inicio', { ascending: false })

    // Soma do valor medido por medição
    const totaisPorMedicao: Record<string, number> = {}
    const ids = (medicoes ?? []).map(m => m.id)
    if (ids.length > 0) {
        const { data: itensMed } = await supabase
            .from('medicao_itens')
            .select('medicao_id, valor_medido')
            .in('medicao_id', ids)
        for (const it of itensMed ?? []) {
            const mid = (it as { medicao_id: string | null }).medicao_id
            if (mid) totaisPorMedicao[mid] = (totaisPorMedicao[mid] || 0) + Number((it as { valor_medido: number | null }).valor_medido || 0)
        }
    }
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Controle de Medições</h2>
                
                <Link href={`/obras-eng/${id}/medicao/nova`} className="btn-primary" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '14px', textDecoration: 'none'
                }}>
                    <Plus size={16} />
                    Nova Medição
                </Link>
            </div>

            {!medicoes || medicoes.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '16px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                        margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Ruler size={32} color="var(--text-muted)" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Nenhuma medição encontrada</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Crie a primeira medição para iniciar o controle físico/financeiro.</p>
                </div>
            ) : (
                <div className="glass-card">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)' }}>PERÍODO</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)' }}>STATUS</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)' }}>DATA DE CRIAÇÃO</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)' }}>VALOR MEDIDO</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)' }}>AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {medicoes.map((med) => (
                                <tr key={med.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500 }}>
                                        {new Date(med.periodo_inicio).toLocaleDateString('pt-BR')} até {new Date(med.periodo_fim).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600,
                                            color: med.status === 'Concluída' ? 'var(--accent-green)' : 'var(--accent-blue)',
                                            background: med.status === 'Concluída' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                            padding: '4px 10px', borderRadius: '12px'
                                        }}>
                                            {med.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                        {new Date(med.created_at || '').toLocaleDateString('pt-BR')}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-green)' }}>
                                        {fmt(totaisPorMedicao[med.id] || 0)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <Link href={`/obras-eng/${id}/medicao/${med.id}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>
                                            Ver Detalhes
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
