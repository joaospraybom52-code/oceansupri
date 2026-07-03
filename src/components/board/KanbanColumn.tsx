'use client'

import { useState, type ReactNode } from 'react'
import type { BoardColumn } from '@/lib/utils/kpi-calculations'

interface KanbanColumnProps {
    status: BoardColumn
    label: string
    color: string
    count: number
    children: ReactNode
    onDrop: (pedidoId: string) => void
    isDragOver: boolean
    isReadOnly?: boolean
    dragDisabled?: boolean
}

export default function KanbanColumn({ status, label, color, count, children, onDrop, isReadOnly = false, dragDisabled = false }: KanbanColumnProps) {
    const [dragOver, setDragOver] = useState(false)
    const noDrop = isReadOnly || dragDisabled

    return (
        <div
            className="kanban-column"
            style={{
                flex: '0 0 300px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                borderColor: dragOver ? color : undefined,
                boxShadow: dragOver ? `0 0 20px ${color}22` : undefined,
            }}
            onDragOver={(e) => {
                if (noDrop) return
                e.preventDefault();
                setDragOver(true)
            }}
            onDragLeave={() => {
                if (noDrop) return
                setDragOver(false)
            }}
            onDrop={(e) => {
                if (noDrop) return
                e.preventDefault()
                setDragOver(false)

                const dragData = e.dataTransfer.getData('text/plain')
                if (dragData) {
                    onDrop(dragData)
                }
            }}
        >
            {/* Column Header */}
            <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--border-glass)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{label}</span>
                </div>
                <span style={{
                    fontSize: '11px', fontWeight: 700, color: color,
                    background: `${color}15`, borderRadius: '6px', padding: '2px 8px'
                }}>
                    {count}
                </span>
            </div>

            {/* Cards Container */}
            <div style={{
                flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px',
                overflowY: 'auto', minHeight: '100px'
            }}>
                {children}
            </div>
        </div>
    )
}
