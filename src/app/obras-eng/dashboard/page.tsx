import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { HardHat, Activity, Clock, Plus, BarChart3, AlertTriangle } from 'lucide-react'
import { Database } from '@/lib/types/database'

type ObraEng = Database['public']['Tables']['obras_eng']['Row']

export default async function GlobalDashboardPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    // Ignorado no modo de leitura do server component
                },
            },
        }
    )

    // Buscar obras
    const { data: obras, error } = await supabase
        .from('obras_eng')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return (
            <div style={{ padding: '24px' }}>
                <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ color: 'var(--accent-red)', marginBottom: '8px' }}>Erro ao carregar Dashboard Global</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>{error.message}</p>
                </div>
            </div>
        )
    }

    const obrasAtivas = obras?.filter(o => o.status === 'em_andamento') || []
    const obrasConcluidas = obras?.filter(o => o.status === 'concluida') || []
    const obrasPlanejamento = obras?.filter(o => o.status === 'planejamento') || []

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Dashboard Global de Engenharia</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Visão geral de todas as obras cadastradas no sistema</p>
                </div>
                <Link href="/obras-eng/nova" style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', background: 'var(--accent-blue)', color: '#fff',
                    borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: 500,
                    transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
                }}>
                    <Plus size={18} />
                    Nova Obra
                </Link>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(99,102,241,0.1)', borderRadius: '12px', color: 'var(--accent-blue)' }}>
                        <HardHat size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Obras</p>
                        <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{obras?.length || 0}</h2>
                    </div>
                </div>

                <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', borderRadius: '12px', color: 'var(--accent-green)' }}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Em Andamento</p>
                        <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{obrasAtivas.length}</h2>
                    </div>
                </div>

                <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(234,179,8,0.1)', borderRadius: '12px', color: 'var(--accent-orange)' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Em Planejamento</p>
                        <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{obrasPlanejamento.length}</h2>
                    </div>
                </div>
            </div>

            {/* Listagem Rápida */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart3 size={20} color="var(--text-secondary)" />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Monitoramento de Obras</h3>
                </div>
                
                {(!obras || obras.length === 0) ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <AlertTriangle size={48} color="var(--border-color)" style={{ margin: '0 auto 16px' }} />
                        <p>Nenhuma obra cadastrada no sistema.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>Obra</th>
                                    <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>Status</th>
                                    <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>Início</th>
                                    <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>Fim Previsto</th>
                                    <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px', textAlign: 'right' }}>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {obras.map((obra) => (
                                    <tr key={obra.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{obra.nome}</span>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                background: obra.status === 'em_andamento' ? 'rgba(34,197,94,0.1)' : obra.status === 'planejamento' ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.05)',
                                                color: obra.status === 'em_andamento' ? 'var(--accent-green)' : obra.status === 'planejamento' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                                            }}>
                                                {obra.status === 'em_andamento' ? 'Em Andamento' : obra.status === 'planejamento' ? 'Planejamento' : 'Concluída'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                            {obra.data_inicio ? new Date(obra.data_inicio).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                            {obra.data_fim ? new Date(obra.data_fim).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <Link href={`/obras-eng/${obra.id}/dashboard`} style={{
                                                padding: '6px 12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                color: 'var(--text-primary)',
                                                borderRadius: 'var(--radius-sm)',
                                                textDecoration: 'none',
                                                fontSize: '13px',
                                                transition: 'background 0.2s'
                                            }}>
                                                Acessar
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
