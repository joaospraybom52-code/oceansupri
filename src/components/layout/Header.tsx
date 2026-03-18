'use client'

import { useState, useEffect } from 'react'
import { Bell, Search, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Alerta } from '@/lib/types/database'
import AlertPopup from './AlertPopup'

export default function Header() {
    const [alertas, setAlertas] = useState<Alerta[]>([])
    const [showAlerts, setShowAlerts] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const supabase = createClient()

    useEffect(() => {
        loadAlertas()

        const channel = supabase
            .channel('alertas-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, (payload) => {
                setAlertas(prev => [payload.new as Alerta, ...prev])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    async function loadAlertas() {
        const { data } = await supabase
            .from('alertas')
            .select('*')
            .eq('lido', false)
            .order('criado_em', { ascending: false })
            .limit(20)
        if (data) setAlertas(data)
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const unreadCount = alertas.filter(a => !a.lido).length

    return (
        <>
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar pedido, obra..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '36px', width: '300px', fontSize: '13px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => setShowAlerts(!showAlerts)}
                        style={{
                            position: 'relative', background: 'var(--bg-glass)',
                            border: '1px solid var(--border-glass)', borderRadius: '10px',
                            padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent-blue)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-glass)' }}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4, width: 18, height: 18,
                                borderRadius: '50%', background: 'var(--accent-red)',
                                color: 'white', fontSize: '10px', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                animation: 'alertPulse 2s ease-in-out infinite'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border-glass)', borderRadius: '10px',
                            padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-red)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                        title="Sair"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {showAlerts && (
                <AlertPopup
                    alertas={alertas}
                    onClose={() => setShowAlerts(false)}
                    onMarkRead={async (id) => {
                        await supabase.from('alertas').update({ lido: true }).eq('id', id)
                        setAlertas(prev => prev.filter(a => a.id !== id))
                    }}
                />
            )}
        </>
    )
}
