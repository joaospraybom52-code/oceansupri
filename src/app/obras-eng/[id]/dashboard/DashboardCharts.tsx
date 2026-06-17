'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  AreaChart,
  Area,
} from 'recharts'
import { BarChart3, TrendingUp } from 'lucide-react'

/* ────────────────────────── Types ────────────────────────── */

export interface MedicaoChartItem {
  id: string
  label: string
  periodoLabel?: string
  valorMedido: number
  acumulado: number
}

export interface PPCChartItem {
  label: string
  ppc: number
}

interface DashboardChartsProps {
  medicoesData: MedicaoChartItem[]
  ppcData: PPCChartItem[]
}

/* ────────────────────────── Formatters ────────────────────────── */

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatCurrencyShort = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return `R$ ${value}`
}

/* ────────────────────────── Custom Tooltip ────────────────────────── */

const tooltipStyle: React.CSSProperties = {
  background: 'rgba(17, 17, 40, 0.95)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  padding: '14px 18px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
}

const tooltipLabel: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const tooltipRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px',
  fontSize: '13px',
  fontWeight: 500,
}

function MedicaoTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null
  const itemLabel = payload[0]?.payload?.periodoLabel || payload[0]?.payload?.label || label
  return (
    <div style={tooltipStyle}>
      <p style={tooltipLabel}>{itemLabel}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={tooltipRow}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: entry.color,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#cbd5e1' }}>
            {entry.name === 'valorMedido' ? 'Medido' : 'Acumulado'}:
          </span>
          <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
            {formatCurrency(Number(entry.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  )
}

function PPCTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <p style={tooltipLabel}>{label}</p>
      <div style={tooltipRow}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#6366f1',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ color: '#cbd5e1' }}>PPC:</span>
        <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
          {(payload[0].value ?? 0).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

/* ────────────────────────── Empty State ────────────────────────── */

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
        opacity: 0.5,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={28} color="#6366f1" />
      </div>
      <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>
        {text}
      </p>
    </div>
  )
}

/* ────────────────────────── Section Header ────────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
  color,
}: {
  icon: React.ElementType
  title: string
  color: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
      <div
        style={{
          padding: '10px',
          borderRadius: '12px',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={color} />
      </div>
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#f1f5f9',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
    </div>
  )
}

/* ═══════════════════════════ MAIN COMPONENT ═══════════════════════════ */

export default function DashboardCharts({ medicoesData, ppcData }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '24px',
      }}
    >
      {/* ─── Evolução das Medições (ComposedChart) ─── */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <SectionHeader icon={BarChart3} title="Evolução das Medições" color="#6366f1" />
        {medicoesData.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            text="Nenhuma medição registrada ainda. Os dados aparecerão aqui conforme medições forem criadas."
          />
        ) : !mounted ? (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            Carregando gráfico...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={medicoesData}
              margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="id"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                dy={8}
                tickFormatter={(id) => {
                  const item = medicoesData.find((d) => d.id === id)
                  return item ? item.label : ''
                }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrencyShort}
                width={70}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#34d399', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrencyShort}
                width={70}
              />
              <Tooltip content={<MedicaoTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="valorMedido"
                name="valorMedido"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="acumulado"
                name="acumulado"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: '#111128',
                  stroke: '#10b981',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: '#10b981',
                  stroke: '#111128',
                  strokeWidth: 2,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {medicoesData.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '28px',
              marginTop: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '4px',
                  background: '#6366f1',
                }}
              />
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                Valor Medido
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: 14,
                  height: 3,
                  borderRadius: '2px',
                  background: '#10b981',
                }}
              />
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                Curva S (Acumulado)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Evolução PPC (AreaChart) ─── */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <SectionHeader icon={TrendingUp} title="Evolução PPC — Planos Concluídos" color="#10b981" />
        {ppcData.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            text="Nenhuma programação semanal encontrada. O PPC será exibido quando houver tarefas cadastradas."
          />
        ) : !mounted ? (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            Carregando gráfico...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={ppcData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="ppcGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
                dy={8}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
                width={50}
              />
              <Tooltip content={<PPCTooltip />} />
              <Area
                type="monotone"
                dataKey="ppc"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#ppcGradient)"
                dot={{
                  r: 5,
                  fill: '#111128',
                  stroke: '#6366f1',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: '#6366f1',
                  stroke: '#111128',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {ppcData.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                }}
              />
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                PPC Semanal (%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
