'use client'

import { useState } from 'react'
import { PedidoCompra } from '@/lib/types/database'
import { STATUS_COLORS, formatCurrency, isDeliveryImminent, isOverdue } from '@/lib/utils/kpi-calculations'
import { timeAgo, formatDate, daysUntil } from '@/lib/utils/date-helpers'
import { createClient } from '@/lib/supabase/client'
import { Building2, User, Clock, AlertTriangle, CalendarCheck, Trash2, CheckCircle } from 'lucide-react'

interface KanbanCardProps {
    pedidos: PedidoCompra[]
    onDragStart: (dragData: string) => void
    onClick: () => void
    onDropOnCard?: (draggedData: string, targetId: string) => void
    onDelete?: (id: string) => void
    onCompradorChange?: (pedido: PedidoCompra, newCompradorId: string) => void
    compradores?: { id: string, nome: string }[]
}

export default function KanbanCard({ pedidos, onDragStart, onClick, onDropOnCard, onDelete, onCompradorChange, compradores = [] }: KanbanCardProps) {
    const [deleting, setDeleting] = useState(false)
    const [dragOverCard, setDragOverCard] = useState(false)
    const supabase = createClient()

    const isGroup = pedidos.length > 1;
    const master = pedidos[0];
    const dragData = master.grupo_cotacao_id ? `group:${master.grupo_cotacao_id}` : `pedido:${master.id}`;

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (deleting) return
        setDeleting(true)

        // Delete all items in the group
        const ids = pedidos.map(p => p.id);
        const { error } = await supabase.from('pedidos_compra').delete().in('id', ids)
        if (error) {
            console.error('Delete error:', error)
            setDeleting(false)
            return
        }
        if (onDelete) ids.forEach(id => onDelete(id))
    }

    const imminent = isDeliveryImminent(master.data_previsao_entrega)
    const overdue = isOverdue(master.data_previsao_entrega, master.data_entrega_real)
    const daysLeft = daysUntil(master.data_previsao_entrega)

    // Sums
    const valorFechadoTotal = pedidos.reduce((acc, p) => acc + (p.valor_fechado || 0), 0)
    const valorFreteTotal = pedidos.reduce((acc, p) => acc + (p.valor_frete || 0), 0)
    const valorOrcadoTotal = pedidos.reduce((acc, p) => acc + (p.valor_orcado || 0), 0)
    const hasFechado = pedidos.some(p => p.valor_fechado != null)
    const hasOrcado = pedidos.some(p => p.valor_orcado != null)

    // Agrupados
    const title = isGroup ? `Múltiplos Insumos (${pedidos.length} itens)` : master.descricao_insumo;
    const numPedidosUau = Array.from(new Set(pedidos.map(p => p.numero_pedido).filter(Boolean))).join(', ') || '--';
    const numCodigosObra = Array.from(new Set(pedidos.map(p => p.codigo_uau).filter(Boolean))).join(', ') || '--';
    const numCotacoes = Array.from(new Set(pedidos.map(p => p.categoria_cap).filter(Boolean))).join(', ') || '--';
    const numOcs = Array.from(new Set(pedidos.map(p => p.numero_ordem_compra).filter(Boolean))).join(', ') || '--';

    const isHighValue = valorFechadoTotal > 5000 || valorOrcadoTotal > 5000;

    return (
        <div
            className={`kanban-card ${imminent || overdue ? 'alert-pulse' : ''} ${isHighValue ? 'high-value' : ''}`}
            style={{
                transition: 'all 0.2sease',
                borderColor: dragOverCard ? 'var(--accent-blue)' : undefined,
                boxShadow: dragOverCard ? '0 0 15px rgba(56, 189, 248, 0.3)' : undefined,
                borderWidth: isGroup ? '2px' : undefined,
            }}
            draggable
            onDragStart={(e) => {
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'copyMove'
                    e.dataTransfer.setData('text/plain', `${dragData}|${master.status_fsm}`)
                }
                onDragStart(dragData)
            }}
            onDragEnter={(e) => {
                if (!onDropOnCard) return;
                e.preventDefault();
                setDragOverCard(true);
            }}
            onDragOver={(e) => {
                if (!onDropOnCard) return;
                e.preventDefault(); // Obrigatório no React para permitir o Drop
                e.dataTransfer.dropEffect = 'move'
                setDragOverCard(true);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                // Ensure we don't flash on child elements
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverCard(false);
            }}
            onDrop={(e) => {
                if (!onDropOnCard) return;

                const rawDragData = e.dataTransfer.getData('text/plain');
                if (!rawDragData) return;

                const [draggedIdData, sourceStatus] = rawDragData.split('|');

                // Só agrupa se ambos estiverem na mesma coluna
                if (sourceStatus === master.status_fsm && draggedIdData !== dragData) {
                    e.preventDefault();
                    e.stopPropagation(); // Previne que a coluna capture e mude o status
                    setDragOverCard(false);
                    onDropOnCard(draggedIdData, master.id);
                } else {
                    // Se for para outra coluna, deixa o KanbanColumn cuidar do drop (bubble up)
                    setDragOverCard(false);
                }
            }}
            onClick={onClick}
        >
            {/* Header: Insumo + Emergency Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3, flex: 1, pointerEvents: 'none' }}>
                    {title}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isGroup && (
                        <span className="badge" style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent-blue)', flexShrink: 0 }}>
                            Agrupado
                        </span>
                    )}
                    {master.emergencial && (
                        <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red-light)', flexShrink: 0 }}>
                            <AlertTriangle size={10} />
                            Urgente
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={handleDelete}
                        title="Excluir"
                        disabled={deleting}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', opacity: deleting ? 0.5 : 1 }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Obra e Código UAU */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Building2 size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {master.obra?.nome || 'Obra não definida'}
                    {numCodigosObra && numCodigosObra !== '--' && (
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '4px' }}>
                            ({numCodigosObra})
                        </span>
                    )}
                </span>
            </div>

            {/* Comprador */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                {(() => {
                    const resolvedName = master.comprador?.nome ||
                        compradores.find(c => c.id === master.comprador_id)?.nome ||
                        master.solicitante_obra ||
                        '—';
                    const iconChar = resolvedName !== '—' ? resolvedName.charAt(0).toUpperCase() : '?';

                    return (
                        <>
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: STATUS_COLORS[master.status_fsm || 'requisitado'],
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '9px', fontWeight: 700, color: 'white', flexShrink: 0
                            }}>
                                {iconChar}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {resolvedName}
                            </span>
                        </>
                    );
                })()}
            </div>

            {/* Numbers: Pedido / Cotação / OC */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                <div style={{ background: 'var(--bg-glass)', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Pedido uau</span>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={numPedidosUau}>
                        {numPedidosUau}
                    </div>
                </div>
                <div style={{ background: 'var(--bg-glass)', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Cotação</span>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={numCotacoes}>
                        {numCotacoes}
                    </div>
                </div>
                <div style={{ background: 'var(--bg-glass)', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>O.C</span>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={numOcs}>
                        {numOcs}
                    </div>
                </div>
            </div>

            {/* Footer: Value + Time */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '8px', borderTop: '1px solid var(--border-glass)'
            }}>
                {(hasFechado) ? (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)' }}>
                        {formatCurrency(valorFechadoTotal + valorFreteTotal)}
                    </span>
                ) : hasOrcado ? (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                        {formatCurrency(valorOrcadoTotal)}
                    </span>
                ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sem valor</span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {master.data_previsao_entrega && (
                        <span style={{
                            fontSize: '11px', fontWeight: 600,
                            color: master.status_fsm === 'entregue' ? 'var(--accent-green)' : overdue ? 'var(--accent-red)' : imminent ? 'var(--accent-amber)' : 'var(--text-primary)',
                            background: master.status_fsm === 'entregue' ? 'rgba(34, 197, 94, 0.15)' : overdue ? 'rgba(239, 68, 68, 0.15)' : imminent ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-glass)',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            {master.status_fsm === 'entregue' ? (
                                <><CheckCircle size={12} /> Entregue</>
                            ) : overdue ? (
                                <><AlertTriangle size={12} /> Atrasado</>
                            ) : imminent ? (
                                <><Clock size={12} /> Amanhã</>
                            ) : daysLeft !== null ? (
                                <><CalendarCheck size={12} /> {daysLeft} dias para entrega</>
                            ) : null}
                        </span>
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {timeAgo(master.created_at)}
                    </span>
                </div>
            </div>
        </div>
    )
}
