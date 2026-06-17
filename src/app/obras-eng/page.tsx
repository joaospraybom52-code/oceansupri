import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HardHat, Plus, Calendar, CalendarDays, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ObrasListPage() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: obras, error } = await supabase.from('obras_eng').select('*').order('created_at', { ascending: false })

        if (error) {
            throw new Error(error.message)
        }

        return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
                        Obras
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        Gerencie suas obras, medições e programações semanais
                    </p>
                </div>
                {obras && obras.length > 0 && (
                    <Link href="/obras-eng/nova" className="btn-primary" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px', fontSize: '14px', textDecoration: 'none'
                    }}>
                        <Plus size={16} />
                        Nova Obra
                    </Link>
                )}
            </div>

            {/* List or Empty State */}
            {!obras || obras.length === 0 ? (
                <div className="glass-card" style={{
                    padding: '60px 40px',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '18px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        margin: '0 auto 24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <HardHat size={36} color="var(--accent-green)" />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                        Nenhuma obra cadastrada
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                        Comece cadastrando sua primeira obra e importando o orçamento via planilha Excel.
                    </p>
                    <Link href="/obras-eng/nova" className="btn-primary" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '12px 24px', fontSize: '15px', textDecoration: 'none'
                    }}>
                        <Plus size={18} />
                        Nova Obra
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {obras.map(obra => (
                        <div key={obra.id} className="glass-card hover-lift" style={{ padding: '20px', cursor: 'pointer' }}>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '10px',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <HardHat size={20} color="var(--accent-green)" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{obra.nome}</h3>
                                        <span style={{ 
                                            fontSize: '11px', fontWeight: 600, 
                                            color: obra.status === 'Ativa' ? 'var(--accent-green)' : 'var(--text-muted)',
                                            background: obra.status === 'Ativa' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                                            padding: '2px 8px', borderRadius: '12px', display: 'inline-block', marginTop: '4px'
                                        }}>
                                            {obra.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                                <Link href={`/obras-eng/${obra.id}/dashboard`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)' }}>
                                    <BarChart3 size={14} /> Painel
                                </Link>
                                <Link href={`/obras-eng/${obra.id}/medicao`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)' }}>
                                    <Calendar size={14} /> Medição
                                </Link>
                                <Link href={`/obras-eng/${obra.id}/programacao`} title="Programação Semanal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', color: 'var(--text-muted)', textDecoration: 'none', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)' }}>
                                    <CalendarDays size={16} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        )
    } catch (err: any) {
        return (
            <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '24px' }}>
                    <h2 style={{ color: 'var(--accent-red)', marginBottom: '16px', fontSize: '20px' }}>Erro interno no Servidor</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Ocorreu um erro ao carregar esta página:</p>
                    <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', textAlign: 'left', overflowX: 'auto', color: 'var(--accent-red-light)', fontSize: '13px' }}>
                        {err.message || String(err)}
                        {err.stack && `\n\nStack:\n${err.stack}`}
                    </pre>
                </div>
            </div>
        )
    }
}
