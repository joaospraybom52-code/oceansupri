'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PedidoCompra } from '@/lib/types/database'
import { STATUS_LABELS, STATUS_COLORS, formatCurrency } from '@/lib/utils/kpi-calculations'
import { formatDateTime } from '@/lib/utils/date-helpers'
import { X, Clock, Building2, User, Trash2, Package } from 'lucide-react'

interface PedidoModalProps {
    pedido: PedidoCompra
    pedidosGroup?: PedidoCompra[]
    onClose: () => void
    onUpdate?: (updated: PedidoCompra, allUpdated?: PedidoCompra[]) => void
    onDelete?: (id: string) => void
    isReadOnly?: boolean
    canDelete?: boolean
}

const dedup = (arr: (string | null)[]) => Array.from(new Set(arr.filter(Boolean) as string[]))
const menorData = (arr: (string | null)[]) => arr.filter(Boolean).sort()[0] as string | undefined

export default function PedidoModal({ pedido, pedidosGroup, onClose, onDelete, isReadOnly = false, canDelete = false }: PedidoModalProps) {
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [saving, setSaving] = useState(false)
    const supabase = createClient()

    const grupo = pedidosGroup && pedidosGroup.length > 0 ? pedidosGroup : [pedido]
    const isGroup = grupo.length > 1

    const insumos = grupo.map(p => p.descricao_insumo).filter(Boolean) as string[]
    const pedidosUnicos = dedup(grupo.map(p => p.numero_pedido))
    const obrasUnicas = dedup(grupo.map(p => p.codigo_uau))
    const cotacoes = dedup(grupo.map(p => p.categoria_cap))
    const ocs = dedup(grupo.map(p => p.numero_ordem_compra))
    const compradorUau = dedup(grupo.map(p => p.comprador_uau)).join(', ')
    const valorFechadoTotal = grupo.reduce((a, p) => a + (p.valor_fechado || 0), 0)
    const dataEmCotacao = menorData(grupo.map(p => p.data_em_cotacao))
    const dataOrdemGerada = menorData(grupo.map(p => p.data_ordem_gerada))

    async function executeDelete() {
        setSaving(true)
        let query = supabase.from('pedidos_compra').delete()
        query = pedido.grupo_cotacao_id ? query.eq('grupo_cotacao_id', pedido.grupo_cotacao_id) : query.eq('id', pedido.id)
        const { error } = await query
        setSaving(false)
        if (error) { console.error('Delete error:', error); setConfirmingDelete(false); return }
        if (onDelete) onDelete(pedido.id)
        onClose()
    }

    const infoBox: React.CSSProperties = { padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }
    const lbl: React.CSSProperties = { fontSize: '10px', color: 'var(--text-muted)' }
    const val: React.CSSProperties = { fontSize: '13px', fontWeight: 600, marginTop: '2px' }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span className="badge" style={{ background: `${STATUS_COLORS[pedido.status_fsm || 'requisitado']}20`, color: STATUS_COLORS[pedido.status_fsm || 'requisitado'] }}>
                                {STATUS_LABELS[pedido.status_fsm || 'requisitado']}
                            </span>
                            {pedido.emergencial && <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red-light)' }}>Urgente</span>}
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                            {isGroup ? `${insumos.length} insumos` : (pedido.descricao_insumo || '—')}
                        </h2>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Pedido #{pedidosUnicos.join(', ') || '—'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {canDelete && (
                            <button type="button" onClick={() => setConfirmingDelete(true)} title="Excluir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)' }}>
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {confirmingDelete && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 'var(--radius-sm)', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-red-light)' }}>Tem certeza que deseja excluir?</span>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button type="button" onClick={() => setConfirmingDelete(false)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>Cancelar</button>
                            <button type="button" onClick={executeDelete} disabled={saving} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent-red)', color: 'white', cursor: 'pointer', fontFamily: 'Inter' }}>
                                {saving ? 'Excluindo...' : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Info Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ ...infoBox, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}><p style={lbl}>Obra</p><p style={val}>{pedido.obra?.nome || 'Não informada'}</p></div>
                    </div>
                    <div style={{ ...infoBox, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}><p style={lbl}>Comprador Responsável</p><p style={val}>{compradorUau || '—'}</p></div>
                    </div>
                    <div style={{ ...infoBox, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}><p style={lbl}>Solicitante na Obra</p><p style={val}>{pedido.solicitante_obra || '—'}</p></div>
                    </div>
                </div>

                {/* Cotação / Pedido / Obra / OC */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={infoBox}><p style={lbl}>Nº Cotação</p><p style={val}>{cotacoes.join(', ') || '—'}</p></div>
                    <div style={infoBox}><p style={lbl}>Nº Pedido (Sistema UAU)</p><p style={val}>{pedidosUnicos.join(', ') || '—'}</p></div>
                    <div style={infoBox}><p style={lbl}>Código da Obra</p><p style={val}>{obrasUnicas.join(', ') || '—'}</p></div>
                    <div style={infoBox}><p style={lbl}>Nº Ordem de Compra</p><p style={val}>{ocs.join(', ') || '—'}</p></div>
                </div>

                {/* Valor Fechado */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ ...infoBox, textAlign: 'center', padding: '14px' }}>
                        <p style={{ ...lbl, marginBottom: '4px' }}>Valor Fechado</p>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green)' }}>{valorFechadoTotal > 0 ? formatCurrency(valorFechadoTotal) : '—'}</p>
                    </div>
                </div>

                {/* Insumos do card */}
                {isGroup && (
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={14} /> Insumos ({insumos.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                            {grupo.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '7px 10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descricao_insumo}</span>
                                    {p.valor_fechado != null && p.valor_fechado > 0 && (
                                        <span style={{ color: 'var(--accent-green)', fontWeight: 600, flexShrink: 0 }}>{formatCurrency(p.valor_fechado)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Histórico de Transições — só as 2 datas */}
                <div style={{ marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} /> Histórico de Transições
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {[{ label: 'Em Cotação', value: dataEmCotacao }, { label: 'Ordem Gerada', value: dataOrdemGerada }].map(({ label, value }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: 'var(--radius-sm)', background: value ? 'rgba(16,185,129,0.05)' : 'transparent' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: value ? 'var(--accent-green)' : 'var(--text-muted)', opacity: value ? 1 : 0.3, flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 500, width: '120px' }}>{label}</span>
                                <span style={{ fontSize: '12px', color: value ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{value ? formatDateTime(value) : 'Pendente'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button onClick={onClose} className="btn-secondary">Fechar</button>
                </div>
            </div>
        </div>
    )
}
