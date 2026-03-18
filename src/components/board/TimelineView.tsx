'use client'

import { PedidoCompra, StatusFSM } from '@/lib/types/database'
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from '@/lib/utils/kpi-calculations'
import { format, parseISO, differenceInDays, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TimelineViewProps {
    pedidos: PedidoCompra[]
    onSelectPedido: (pedido: PedidoCompra) => void
}

export default function TimelineView({ pedidos, onSelectPedido }: TimelineViewProps) {
    if (pedidos.length === 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
                Nenhum pedido para exibir na timeline
            </div>
        )
    }

    // Calculate timeline range
    const allDates = pedidos.flatMap(p => [p.data_requisicao, p.data_entrega_real, p.data_previsao_entrega].filter(Boolean)) as string[]
    const minDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())))
    const maxDate = addDays(new Date(Math.max(...allDates.map(d => new Date(d).getTime()))), 7)
    const totalDays = Math.max(differenceInDays(maxDate, minDate), 14)

    // Generate week markers
    const weeks: Date[] = []
    let current = new Date(minDate)
    while (current <= maxDate) {
        weeks.push(new Date(current))
        current = addDays(current, 7)
    }

    function getBarPosition(dateStr: string | null): number {
        if (!dateStr) return 0
        const d = new Date(dateStr)
        return (differenceInDays(d, minDate) / totalDays) * 100
    }

    function getBarWidth(startStr: string | null, endStr: string | null): number {
        if (!startStr) return 0
        const start = new Date(startStr)
        const end = endStr ? new Date(endStr) : new Date()
        const days = Math.max(differenceInDays(end, start), 1)
        return (days / totalDays) * 100
    }

    // Get segments for each pedido
    function getSegments(p: PedidoCompra) {
        const segments: { status: StatusFSM; left: number; width: number }[] = []
        const transitions: { status: StatusFSM; date: string | null }[] = [
            { status: 'requisitado', date: p.data_requisicao },
            { status: 'em_cotacao', date: p.data_inicio_cotacao },
            { status: 'aguardando_aprovacao', date: p.data_envio_aprovacao },
            { status: 'aprovado', date: p.data_aprovacao_diretoria },
            { status: 'ordem_gerada', date: p.data_ordem_compra },
            { status: 'entregue', date: p.data_entrega_real || p.data_previsao_entrega },
        ]

        for (let i = 0; i < transitions.length; i++) {
            const { status, date } = transitions[i]
            if (!date) continue
            const endDate = transitions[i + 1]?.date
            const left = getBarPosition(date)
            const width = endDate ? getBarWidth(date, endDate) : Math.max(getBarWidth(date, null), 1)
            segments.push({ status, left, width: Math.max(width, 0.8) })
        }

        return segments
    }

    return (
        <div style={{ overflowX: 'auto', minHeight: 'calc(100vh - 220px)' }}>
            {/* Week Headers */}
            <div style={{ position: 'relative', height: '30px', borderBottom: '1px solid var(--border-glass)', marginBottom: '8px', minWidth: '900px' }}>
                {weeks.map((week, i) => {
                    const left = (differenceInDays(week, minDate) / totalDays) * 100
                    return (
                        <div key={i} style={{
                            position: 'absolute', left: `${left}%`,
                            fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600,
                            borderLeft: '1px solid var(--border-glass)',
                            paddingLeft: '6px', height: '100%', display: 'flex', alignItems: 'center'
                        }}>
                            {format(week, 'dd/MM', { locale: ptBR })}
                        </div>
                    )
                })}
            </div>

            {/* Pedido Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '900px' }}>
                {pedidos.map(pedido => {
                    const segments = getSegments(pedido)
                    return (
                        <div
                            key={pedido.id}
                            style={{
                                display: 'flex', alignItems: 'center', height: '36px', gap: '12px',
                                cursor: 'pointer', padding: '0 4px', borderRadius: 'var(--radius-sm)',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-glass)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            onClick={() => onSelectPedido(pedido)}
                        >
                            {/* Label */}
                            <div style={{ width: '200px', flexShrink: 0, overflow: 'hidden' }}>
                                <p style={{ fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {pedido.descricao_insumo}
                                </p>
                                <p style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{pedido.obra?.nome}</p>
                            </div>

                            {/* Bar Chart */}
                            <div style={{ flex: 1, position: 'relative', height: '28px' }}>
                                {segments.map((seg, i) => (
                                    <div
                                        key={i}
                                        className="timeline-bar"
                                        style={{
                                            position: 'absolute',
                                            left: `${seg.left}%`,
                                            width: `${seg.width}%`,
                                            background: STATUS_COLORS[seg.status],
                                            opacity: 0.85,
                                        }}
                                        title={`${STATUS_LABELS[seg.status]}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap' }}>
                {STATUS_ORDER.map(status => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '3px', background: STATUS_COLORS[status] }} />
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{STATUS_LABELS[status]}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
