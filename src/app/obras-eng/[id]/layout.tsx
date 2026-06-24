import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Ruler, CalendarDays, AlertTriangle, TrendingUp, BarChart3, FileText } from 'lucide-react'

export default async function ObraContextLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    try {
        const { id } = await params
        const supabase = await createServerSupabaseClient()
        const { data: obra, error } = await supabase
            .from('obras_eng')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            throw new Error(error.message)
        }

        if (!obra) {
            redirect('/obras-eng')
        }

        const navItems = [
            { href: `/obras-eng/${id}/dashboard`, label: 'Resumo', icon: LayoutDashboard },
            { href: `/obras-eng/${id}/medicao`, label: 'Medições', icon: Ruler },
            { href: `/obras-eng/${id}/programacao`, label: 'Programação Semanal', icon: CalendarDays },
            { href: `/obras-eng/${id}/curva-s`, label: 'Curva S', icon: TrendingUp },
            { href: `/obras-eng/${id}/histograma`, label: 'Histograma', icon: BarChart3 },
            { href: `/obras-eng/${id}/relatorio`, label: 'Relatório', icon: FileText },
        ]

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header da Obra */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>{obra.nome}</h1>
                            <span style={{
                                fontSize: '12px', fontWeight: 600,
                                color: obra.status === 'Ativa' ? 'var(--accent-green)' : 'var(--text-muted)',
                                background: obra.status === 'Ativa' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                                padding: '4px 10px', borderRadius: '12px'
                            }}>
                                {obra.status}
                            </span>
                        </div>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <span>Cadastrada em {new Date(obra.created_at || '').toLocaleDateString('pt-BR')}</span>
                            {obra.codigo_uau && (
                                <span style={{ color: 'var(--accent-blue-light)', fontWeight: 600 }}>
                                    Código UAU: {obra.codigo_uau}
                                </span>
                            )}
                            {obra.local && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    📍 {obra.local}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Tabs / Submenu */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0' }}>
                    {navItems.map(item => (
                        <Link key={item.href} href={item.href} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '12px 16px', fontSize: '14px', fontWeight: 600,
                            color: 'var(--text-secondary)', textDecoration: 'none',
                            borderBottom: '2px solid transparent',
                            transition: 'all 0.2s ease',
                            marginBottom: '-1px'
                        }}
                        className="obra-tab"
                        >
                            <item.icon size={16} />
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Conteúdo específico da aba */}
            <div>
                {children}
            </div>
        </div>
        )
    } catch (err: any) {
        return (
            <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '24px' }}>
                    <h2 style={{ color: 'var(--accent-red)', marginBottom: '16px', fontSize: '20px' }}>Erro interno no Servidor</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Ocorreu um erro ao carregar o contexto da obra:</p>
                    <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', textAlign: 'left', overflowX: 'auto', color: 'var(--accent-red-light)', fontSize: '13px' }}>
                        {err.message || String(err)}
                        {err.stack && `\n\nStack:\n${err.stack}`}
                    </pre>
                </div>
            </div>
        )
    }
}
