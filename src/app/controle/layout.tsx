'use client'

import { useRouter, usePathname } from 'next/navigation'
import { LineChart, ArrowLeftRight, LogOut, BarChart3, Receipt, Landmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Toaster } from 'sonner'

export default function ControleLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    async function handleLogout() {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <aside className="sidebar">
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <LineChart size={20} color="white" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Controle
                            </h1>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                Previsão de Medições
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
                    <button
                        onClick={() => router.push('/controle')}
                        className={`sidebar-link${pathname === '/controle' ? ' active' : ''}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '14px', textAlign: 'left' }}
                    >
                        <LineChart size={18} />
                        Painel de Recebimentos
                    </button>
                    <button
                        onClick={() => router.push('/controle/kpis')}
                        className={`sidebar-link${pathname?.startsWith('/controle/kpis') ? ' active' : ''}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '14px', textAlign: 'left' }}
                    >
                        <BarChart3 size={18} />
                        KPI&apos;S
                    </button>
                    <button
                        onClick={() => router.push('/controle/dre')}
                        className={`sidebar-link${pathname?.startsWith('/controle/dre') ? ' active' : ''}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '14px', textAlign: 'left' }}
                    >
                        <Landmark size={18} />
                        DRE Sede
                    </button>
                    <button
                        onClick={() => router.push('/controle/cadastro-venda')}
                        className={`sidebar-link${pathname?.startsWith('/controle/cadastro-venda') ? ' active' : ''}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '14px', textAlign: 'left' }}
                    >
                        <Receipt size={18} />
                        Cadastro de venda
                    </button>
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
