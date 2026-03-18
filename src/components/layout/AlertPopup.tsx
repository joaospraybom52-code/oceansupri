'use client'

import { X, AlertTriangle, Bell, Truck } from 'lucide-react'
import { Alerta } from '@/lib/types/database'
import { timeAgo } from '@/lib/utils/date-helpers'

interface AlertPopupProps {
    alertas: Alerta[]
    onClose: () => void
    onMarkRead: (id: string) => void
}

const iconMap: Record<string, typeof Bell> = {
    entrega_iminente: Truck,
    atraso: AlertTriangle,
    sistema: Bell,
}

export default function AlertPopup({ alertas, onClose, onMarkRead }: AlertPopupProps) {
    return (
        <div style={{
            position: 'fixed', top: 'var(--header-height)', right: '16px',
            width: '380px', maxHeight: '480px', zIndex: 50,
            background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden', animation: 'slideUp 0.2s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-glass)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Notificações</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={16} />
                </button>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
                {alertas.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <p style={{ fontSize: '13px' }}>Nenhuma notificação pendente</p>
                    </div>
                ) : (
                    alertas.map(alerta => {
                        const Icon = iconMap[alerta.tipo] || Bell
                        const isUrgent = alerta.tipo === 'entrega_iminente' || alerta.tipo === 'atraso'
                        return (
                            <div key={alerta.id} style={{
                                display: 'flex', gap: '12px', padding: '14px 20px',
                                borderBottom: '1px solid var(--border-glass)',
                                transition: 'background 0.2s',
                                cursor: 'pointer',
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-glass)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                                onClick={() => onMarkRead(alerta.id)}
                            >
                                <div style={{
                                    width: 32, height: 32, borderRadius: '8px',
                                    background: isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Icon size={16} style={{ color: isUrgent ? 'var(--accent-red)' : 'var(--accent-blue)' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{alerta.mensagem}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {timeAgo(alerta.created_at)}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
