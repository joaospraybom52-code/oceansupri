'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PedidoCompra } from '@/lib/types/database'
import { STATUS_LABELS, STATUS_COLORS, formatCurrency, calcSavingAbsoluto, formatPercent, calcSavingPercentual } from '@/lib/utils/kpi-calculations'
import { formatDate, timeAgo } from '@/lib/utils/date-helpers'
import PedidoModal from '@/components/pedidos/PedidoModal'
import { Package, Search, Filter } from 'lucide-react'

export default function PedidosPage() {
    const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
    const [selectedPedido, setSelectedPedido] = useState<PedidoCompra | null>(null)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => { loadPedidos() }, [])

    async function loadPedidos() {
        const { data } = await supabase
            .from('pedidos_compra')
            .select('*, obra:obras(*), comprador:compradores(*)')
            .order('created_at', { ascending: false })
        if (data) setPedidos(data as unknown as PedidoCompra[])
        setLoading(false)
    }

    const filtered = pedidos.filter(p => {
        const matchSearch = !search ||
            p.descricao_insumo.toLowerCase().includes(search.toLowerCase()) ||
            p.obra?.nome?.toLowerCase().includes(search.toLowerCase()) ||
            p.comprador?.nome?.toLowerCase().includes(search.toLowerCase()) ||
            (p.numero_pedido && p.numero_pedido.includes(search))
        const matchStatus = !filterStatus || p.status_fsm === filterStatus
        return matchSearch && matchStatus
    })

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Todos os Pedidos</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filtered.length} de {pedidos.length} pedidos</p>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" style={{ paddingLeft: '36px' }} placeholder="Buscar por insumo, obra, comprador ou nº pedido..." />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="select-field" style={{ width: '200px' }}>
                    <option value="">Todos os status</option>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                {['Insumo', 'Obra', 'Comprador', 'Status', 'Valor Orçado', 'Saving', 'Criado', 'Entrega'].map(h => (
                                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const saving = calcSavingAbsoluto(p.valor_orcado, p.valor_fechado)
                                const savingPct = calcSavingPercentual(p.valor_orcado, p.valor_fechado)
                                return (
                                    <tr key={p.id}
                                        onClick={() => setSelectedPedido(p)}
                                        style={{ borderBottom: '1px solid var(--border-glass)', cursor: 'pointer', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-glass)' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                                    >
                                        <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {p.emergencial && <span style={{ color: 'var(--accent-red)', marginRight: '4px' }}>⚠</span>}
                                            {p.descricao_insumo}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.obra?.nome || '—'}</td>
                                        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.comprador?.nome || '—'}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span className="badge" style={{ background: `${STATUS_COLORS[p.status_fsm || 'requisitado']}20`, color: STATUS_COLORS[p.status_fsm || 'requisitado'] }}>
                                                {STATUS_LABELS[p.status_fsm || 'requisitado']}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: '12px' }}>{p.valor_orcado ? formatCurrency(p.valor_orcado) : '—'}</td>
                                        <td style={{ padding: '10px 14px', fontSize: '12px', color: saving && saving > 0 ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 600 }}>
                                            {saving !== null ? `${formatCurrency(saving)} (${formatPercent(savingPct!)})` : '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(p.created_at)}</td>
                                        <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(p.data_previsao_entrega)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedPedido && (
                <PedidoModal
                    pedido={selectedPedido}
                    onClose={() => setSelectedPedido(null)}
                    onUpdate={(updated) => {
                        setPedidos(prev => prev.map(p => p.id === updated.id ? updated : p))
                        setSelectedPedido(updated)
                    }}
                    onDelete={(id) => {
                        setPedidos(prev => prev.filter(p => p.id !== id))
                        setSelectedPedido(null)
                    }}
                />
            )}
        </div>
    )
}
