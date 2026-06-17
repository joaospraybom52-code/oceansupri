'use client'

import React, { useState, useEffect } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts'
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────
export interface ObraChartData {
    id: string
    nome: string
    status: string
    valorOrcado: number
    valorMedido: number
    percentual: number
    restricoes: number
}

// ─── Constants ───────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    em_andamento: '#10b981',
    planejamento: '#f59e0b',
    concluida: '#6366f1',
}

const STATUS_LABELS: Record<string, string> = {
    em_andamento: 'Em Andamento',
    planejamento: 'Planejamento',
    concluida: 'Concluída',
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
})

// ─── Custom Tooltip ──────────────────────────────────────────────────
interface BarTooltipProps {
    active?: boolean
    payload?: Array<{
        value: number
        payload: ObraChartData
    }>
}

function BarChartTooltip({ active, payload }: BarTooltipProps) {
    if (!active || !payload?.length) return null
    const data = payload[0].payload
    return (
        <div
            style={{
                background: 'rgba(17, 17, 40, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '14px 18px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
        >
            <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                {data.nome}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Orçado: {currencyFormatter.format(data.valorOrcado)}
                </span>
                <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 500 }}>
                    Medido: {currencyFormatter.format(data.valorMedido)}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Executado: {data.percentual.toFixed(1)}%
                </span>
            </div>
            <div
                style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}
            >
                <span
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: STATUS_COLORS[data.status] || '#64748b',
                    }}
                />
                <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {STATUS_LABELS[data.status] || data.status}
                </span>
            </div>
        </div>
    )
}

interface PieTooltipProps {
    active?: boolean
    payload?: Array<{
        name: string
        value: number
        payload: { fill: string }
    }>
}

function PieChartTooltip({ active, payload }: PieTooltipProps) {
    if (!active || !payload?.length) return null
    const item = payload[0]
    return (
        <div
            style={{
                background: 'rgba(17, 17, 40, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '12px 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                    style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: item.payload.fill,
                    }}
                />
                <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '13px' }}>{item.name}</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', paddingLeft: '18px' }}>
                {item.value} {item.value === 1 ? 'obra' : 'obras'}
            </p>
        </div>
    )
}

// ─── Custom Pie Label ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomLabel(props: any) {
    const { cx, cy, midAngle, innerRadius, outerRadius, value } = props
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (value === 0) return null

    return (
        <text
            x={x}
            y={y}
            fill="#f1f5f9"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            fontWeight={700}
        >
            {value}
        </text>
    )
}

// ─── Custom Legend ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomLegend(props: any) {
    const payload = props?.payload as Array<{ value: string; color: string }> | undefined
    if (!payload) return null
    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px' }}>
            {payload.map((entry) => (
                <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                        style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: entry.color,
                        }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>{entry.value}</span>
                </div>
            ))}
        </div>
    )
}

// ─── Empty State ─────────────────────────────────────────────────────
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '280px',
                gap: '16px',
            }}
        >
            <div
                style={{
                    padding: '16px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                }}
            >
                <Icon size={32} color="#64748b" />
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', maxWidth: '220px' }}>
                {text}
            </p>
        </div>
    )
}

// ─── Custom Bar Shape (rounded + color per status) ───────────────────
interface BarShapeProps {
    x?: number
    y?: number
    width?: number
    height?: number
    payload?: ObraChartData
}

function StatusBar(props: BarShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, payload } = props
    const fill = STATUS_COLORS[payload?.status || ''] || '#64748b'
    const r = Math.min(4, width, height)
    return (
        <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={r}
            ry={r}
            fill={fill}
            fillOpacity={0.85}
        />
    )
}

// ─── Main Component ──────────────────────────────────────────────────
interface GlobalChartsProps {
    obras: ObraChartData[]
}

export default function GlobalCharts({ obras }: GlobalChartsProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    // Bar chart data – sorted by valorMedido descending
    const barData = [...obras]
        .filter((o) => o.valorMedido > 0 || o.valorOrcado > 0)
        .sort((a, b) => b.valorMedido - a.valorMedido)

    // Pie chart data – count by status
    const statusCounts = obras.reduce<Record<string, number>>((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1
        return acc
    }, {})

    const pieData = Object.entries(statusCounts).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        fill: STATUS_COLORS[status] || '#64748b',
    }))

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
                gap: '24px',
                marginBottom: '32px',
            }}
        >
            {/* ── Bar Chart: Valor Medido por Obra ─────────────────── */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '20px',
                    }}
                >
                    <div
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            background: 'rgba(99,102,241,0.12)',
                        }}
                    >
                        <BarChart3 size={18} color="#6366f1" />
                    </div>
                    <div>
                        <h3
                            style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                            }}
                        >
                            Valor Medido por Obra
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Comparativo de valor medido entre obras
                        </p>
                    </div>
                </div>

                {barData.length === 0 ? (
                    <EmptyState icon={BarChart3} text="Nenhuma medição registrada ainda" />
                ) : !mounted ? (
                    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                        Carregando gráfico...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={Math.max(280, barData.length * 50)}>
                        <BarChart
                            data={barData}
                            layout="vertical"
                            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid
                                horizontal={false}
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.04)"
                            />
                            <XAxis
                                type="number"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                tickLine={false}
                                tickFormatter={(v: number) => compactCurrencyFormatter.format(v)}
                            />
                            <YAxis
                                type="category"
                                dataKey="nome"
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                width={140}
                            />
                            <Tooltip
                                content={<BarChartTooltip />}
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            />
                            <Bar
                                dataKey="valorMedido"
                                shape={<StatusBar />}
                                maxBarSize={28}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Pie Chart: Distribuição por Status ────────────────── */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '20px',
                    }}
                >
                    <div
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            background: 'rgba(139,92,246,0.12)',
                        }}
                    >
                        <PieChartIcon size={18} color="#8b5cf6" />
                    </div>
                    <div>
                        <h3
                            style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                            }}
                        >
                            Distribuição por Status
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Visão geral do portfólio
                        </p>
                    </div>
                </div>

                {pieData.length === 0 ? (
                    <EmptyState icon={PieChartIcon} text="Nenhuma obra cadastrada para exibir" />
                ) : !mounted ? (
                    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                        Carregando gráfico...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="45%"
                                innerRadius={55}
                                outerRadius={95}
                                paddingAngle={4}
                                dataKey="value"
                                labelLine={false}
                                label={renderCustomLabel}
                                stroke="none"
                            >
                                {pieData.map((entry, idx) => (
                                    <Cell key={idx} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<PieChartTooltip />} />
                            <Legend content={renderCustomLegend} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}
