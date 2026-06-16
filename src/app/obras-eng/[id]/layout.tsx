import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Ruler, CalendarDays, AlertTriangle } from 'lucide-react'

export default async function ObraContextLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: { id: string }
}) {
    const supabase = await createServerClient()
    const { data: obra } = await supabase
        .from('obras_eng')
        .select('*')
        .eq('id', params.id)
        .single()

    if (!obra) {
        redirect('/obras-eng')
    }

    const navItems = [
        { href: `/obras-eng/${params.id}/dashboard`, label: 'Resumo', icon: LayoutDashboard },
        { href: `/obras-eng/${params.id}/medicao`, label: 'Medições', icon: Ruler },
        { href: `/obras-eng/${params.id}/programacao`, label: 'Programação Semanal', icon: CalendarDays },
        { href: `/obras-eng/${params.id}/restricoes`, label: 'Restrições', icon: AlertTriangle },
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
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Cadastrada em {new Date(obra.created_at || '').toLocaleDateString('pt-BR')}
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
}
