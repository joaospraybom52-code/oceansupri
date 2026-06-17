import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Plus, CalendarDays } from 'lucide-react'
import Link from 'next/link'

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

        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Programação Semanal</h2>
                    
                    <Link href={`/obras-eng/${id}/programacao/nova`} className="btn-primary" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '14px', textDecoration: 'none'
                    }}>
                        <Plus size={16} />
                        Nova Programação
                    </Link>
                </div>

                {!programacoes || programacoes.length === 0 ? (
                    <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '16px',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                            margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <CalendarDays size={32} color="var(--text-muted)" />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Nenhuma programação encontrada</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Crie a primeira programação para iniciar o planejamento (Last Planner).</p>
                    </div>
                ) : (
                    <div className="glass-card">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)' }}>SEMANA</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)' }}>STATUS DO ENVIO</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)' }}>PRAZO</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)' }}>AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {programacoes.map((prog) => (
                                    <tr key={prog.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500 }}>
                                            {new Date(prog.semana_referente_inicio).toLocaleDateString('pt-BR')} até {new Date(prog.semana_referente_fim).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 600,
                                                color: prog.status_envio === 'no_prazo' ? 'var(--accent-green)' : (prog.status_envio === 'atrasada' ? 'var(--accent-red)' : 'var(--accent-amber)'),
                                                background: prog.status_envio === 'no_prazo' ? 'rgba(16, 185, 129, 0.1)' : (prog.status_envio === 'atrasada' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                                                padding: '4px 10px', borderRadius: '12px'
                                            }}>
                                                {prog.status_envio === 'no_prazo' ? 'No Prazo' : (prog.status_envio === 'atrasada' ? 'Atrasada' : 'Pendente')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            {new Date(prog.prazo_envio).toLocaleString('pt-BR')}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <Link href={`/obras-eng/${id}/programacao/${prog.id}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>
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
