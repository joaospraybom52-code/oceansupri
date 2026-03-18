'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PedidoCompra } from '@/lib/types/database'
import { formatCurrency, formatPercent, calcSavingAbsoluto, calcSavingPercentual, calcLeadTimeDays } from '@/lib/utils/kpi-calculations'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Clock, ShoppingCart, AlertTriangle, DollarSign, Users } from 'lucide-react'

export default function AnalyticsPage() {
    const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => { loadData() }, [])

    async function loadData() {
        const { data } = await supabase
            .from('pedidos_compra')
            .select('*, obra:obras(*), comprador:compradores(*)')
        if (data) setPedidos(data as unknown as PedidoCompra[])
        setLoading(false)
    }

    // KPI calculations
    const pedidosComSaving = pedidos.filter(p => p.valor_orcado && p.valor_fechado)
    const savingTotal = pedidosComSaving.reduce((sum, p) => sum + (calcSavingAbsoluto(p.valor_orcado, p.valor_fechado) || 0), 0)
    const savingPercentualMedio = pedidosComSaving.length > 0
        ? pedidosComSaving.reduce((sum, p) => sum + (calcSavingPercentual(p.valor_orcado, p.valor_fechado) || 0), 0) / pedidosComSaving.length
        : 0

    const pedidosEntregues = pedidos.filter(p => p.data_entrega_real)
    const leadTimeMedio = pedidosEntregues.length > 0
        ? pedidosEntregues.reduce((sum, p) => sum + (calcLeadTimeDays(p.data_requisicao, p.data_entrega_real!) || 0), 0) / pedidosEntregues.length
        : 0

    const totalEmergenciais = pedidos.filter(p => p.emergencial).length
    const percentEmergenciais = pedidos.length > 0 ? (totalEmergenciais / pedidos.length) * 100 : 0

    // Saving por comprador
    const savingPorComprador: Record<string, { nome: string; saving: number; cotacoes: number }> = {}
    pedidos.forEach(p => {
        const nome = p.comprador?.nome || 'Sem comprador'
        if (!savingPorComprador[nome]) savingPorComprador[nome] = { nome, saving: 0, cotacoes: 0 }
        savingPorComprador[nome].saving += calcSavingAbsoluto(p.valor_orcado, p.valor_fechado) || 0
        savingPorComprador[nome].cotacoes += 1
    })
    const savingCompradorData = Object.values(savingPorComprador).sort((a, b) => b.saving - a.saving)

    // Desconto mensal
    const descontoMensal: Record<string, { mes: string; total: number; count: number }> = {}
    pedidosComSaving.forEach(p => {
        const date = new Date(p.created_at || new Date())
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!descontoMensal[key]) descontoMensal[key] = { mes: key, total: 0, count: 0 }
        descontoMensal[key].total += calcSavingPercentual(p.valor_orcado, p.valor_fechado) || 0
        descontoMensal[key].count += 1
    })
    const descontoMensalData = Object.values(descontoMensal)
        .map(d => ({ mes: d.mes, desconto: d.count > 0 ? d.total / d.count : 0 }))
        .sort((a, b) => a.mes.localeCompare(b.mes))
        
    // Valor de compra por obra
    const comprasPorObra: Record<string, { nome: string; valorTotal: number }> = {}
    pedidos.forEach(p => {
        if (!p.valor_fechado) return
        
        const nomeDaObra = p.obra?.nome || 'Sem obra atribuída'
        if (!comprasPorObra[nomeDaObra]) comprasPorObra[nomeDaObra] = { nome: nomeDaObra, valorTotal: 0 }
        comprasPorObra[nomeDaObra].valorTotal += p.valor_fechado
    })
    const comprasObraData = Object.values(comprasPorObra).sort((a, b) => b.valorTotal - a.valorTotal)

    // Emergencial pie
    const pieData = [
        { name: 'Planejada', value: pedidos.length - totalEmergenciais },
        { name: 'Emergencial', value: totalEmergenciais },
    ]
    const PIE_COLORS = ['#10b981', '#ef4444']

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: 'var(--text-muted)' }}>
                Carregando dados...
            </div>
        )
    }

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Dashboard de KPIs</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Indicadores de desempenho do setor de suprimentos</p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="kpi-card green">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={18} style={{ color: 'var(--accent-green)' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Saving Total</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-green)' }}>{formatCurrency(savingTotal)}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Média {formatPercent(savingPercentualMedio)} de desconto</p>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={18} style={{ color: 'var(--accent-blue)' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Lead Time Médio</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 800 }}>{leadTimeMedio.toFixed(0)} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>dias</span></p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{pedidosEntregues.length} pedidos entregues</p>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShoppingCart size={18} style={{ color: 'var(--accent-purple)' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total de Pedidos</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 800 }}>{pedidos.length}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{savingCompradorData.length} compradores ativos</p>
                </div>

                <div className={`kpi-card ${percentEmergenciais > 20 ? 'red' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Compras Emergenciais</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 800, color: percentEmergenciais > 20 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                        {formatPercent(percentEmergenciais)}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{totalEmergenciais} de {pedidos.length} pedidos</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Saving por Comprador */}
                <div className="chart-container">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={16} style={{ color: 'var(--accent-green)' }} />
                        Saving por Comprador
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={savingCompradorData} layout="vertical" margin={{ left: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} stroke="var(--text-muted)" fontSize={10} />
                            <YAxis type="category" dataKey="nome" stroke="var(--text-muted)" fontSize={11} width={80} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value) => [formatCurrency(value as number), 'Saving']}
                            />
                            <Bar dataKey="saving" fill="url(#greenGradient)" radius={[0, 4, 4, 0]} />
                            <defs>
                                <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#059669" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Compras Emergenciais Pie */}
                <div className="chart-container">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} />
                        Planejada vs Emergencial
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '-8px' }}>
                        {pieData.map((entry, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i] }} />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{entry.name}: {entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Desconto Mensal */}
                <div className="chart-container">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={16} style={{ color: 'var(--accent-blue)' }} />
                        Evolução Mensal do Desconto (%)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={descontoMensalData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={10} />
                            <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Desconto Médio']}
                            />
                            <Line type="monotone" dataKey="desconto" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Cotações por Comprador */}
                <div className="chart-container">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} style={{ color: 'var(--accent-purple)' }} />
                        Volume de Cotações por Comprador
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={savingCompradorData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={10} />
                            <YAxis stroke="var(--text-muted)" fontSize={10} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '12px' }}
                            />
                            <Bar dataKey="cotacoes" fill="url(#purpleGradient)" radius={[4, 4, 0, 0]} />
                            <defs>
                                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Valor de Compra por Obra */}
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <div className="chart-container">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={16} style={{ color: 'var(--accent-green)' }} />
                        Valor de Compra por Obra
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comprasObraData} margin={{ left: 60, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                                dataKey="nome" 
                                stroke="var(--text-muted)" 
                                fontSize={10} 
                                angle={-25} 
                                textAnchor="end"
                                interval={0} 
                            />
                            <YAxis 
                                stroke="var(--text-muted)" 
                                fontSize={10} 
                                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} 
                            />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value) => [formatCurrency(value as number), 'Total Comprado']}
                            />
                            <Bar dataKey="valorTotal" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} />
                            <defs>
                                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#2563eb" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
