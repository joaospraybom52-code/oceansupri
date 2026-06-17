'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HardHat, LayoutDashboard, ArrowLeftRight, LogOut, List } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Toaster } from 'sonner'

const navItems = [
    { href: '/obras-eng', label: 'Obras', icon: List, exact: true },
    { href: '/obras-eng/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export default function ObrasLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    async function handleLogout() {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside className="sidebar">
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <HardHat size={20} color="white" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Obras
                            </h1>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                Medição e Planejamento
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
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname.startsWith(item.href)
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
                    <button
                        onClick={() => router.push('/')}
                        className="sidebar-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
                    >
                        <ArrowLeftRight size={18} />
                        Trocar de módulo
                    </button>
                    <button
                        onClick={handleLogout}
                        className="sidebar-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
                    >
                        <LogOut size={18} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div style={{ flex: 1, marginLeft: 'var(--sidebar-width)' }}>
                <main style={{ padding: '24px' }}>
                    {children}
                </main>
            </div>

            <Toaster 
                position="top-right" 
                toastOptions={{
                    style: {
                        background: 'rgba(15, 15, 35, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        backdropFilter: 'blur(12px)',
                        fontSize: '14px',
                    },
                }}
                richColors
                closeButton
            />
        </div>
    )
}
