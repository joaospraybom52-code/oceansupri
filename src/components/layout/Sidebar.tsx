'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Kanban, BarChart3, Package, Building2, Users, Settings, Truck } from 'lucide-react'

const navItems = [
    { href: '/board', label: 'Board', icon: Kanban },
    { href: '/analytics', label: 'Dashboard', icon: BarChart3 },
    { href: '/pedidos', label: 'Pedidos', icon: Package },
    { href: '/obras', label: 'Obras', icon: Building2 },
    { href: '/fornecedores', label: 'Fornecedores', icon: Truck },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="sidebar">
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '10px',
                        background: 'var(--gradient-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', fontWeight: 800
                    }}>
                        S
                    </div>
                    <div>
                        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Suprimentos
                        </h1>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Gestão de Compras
                        </span>
                    </div>
                </div>
            </div>

            <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
                <div style={{ padding: '0 20px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>
                        Menu principal
                    </span>
                </div>
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div style={{ padding: '12px', borderTop: '1px solid var(--border-glass)' }}>
                <Link href="/configuracoes" className="sidebar-link">
                    <Settings size={18} />
                    Configurações
                </Link>
            </div>
        </aside>
    )
}
