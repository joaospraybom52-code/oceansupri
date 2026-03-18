'use client'

import { PedidoCompra } from '@/lib/types/database'
import { AlertCircle, Link, X } from 'lucide-react'

interface AutoGroupModalProps {
    pedido: PedidoCompra
    existingMatch: PedidoCompra
    numeroCotacao: string
    onClose: () => void
    onConfirm: (wantsToGroup: boolean) => void
}

export default function AutoGroupModal({ pedido, existingMatch, numeroCotacao, onClose, onConfirm }: AutoGroupModalProps) {
    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', flexShrink: 0
                    }}>
                        <Link size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                            Agrupar Pedidos?
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Identificamos que já existe um pedido Em Cotação com o <strong>Nº {numeroCotacao}</strong>.
                        </p>
                    </div>
                </div>

                <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Cotação Nº {numeroCotacao}</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <li style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
                            {existingMatch.descricao_insumo} <span style={{ color: 'var(--text-muted)' }}>(Já na coluna)</span>
                        </li>
                        <li style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 8px rgba(56,189,248,0.5)' }} />
                            {pedido.descricao_insumo} <span style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: 600 }}>NOVO</span>
                        </li>
                    </ul>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button type="button" onClick={() => onConfirm(false)} className="btn-secondary" style={{ flex: 1 }}>
                        Não, manter separados
                    </button>
                    <button type="button" onClick={() => onConfirm(true)} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Link size={16} />
                        Sim, Agrupar
                    </button>
                </div>
            </div>
        </div>
    )
}
