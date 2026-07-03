'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PedidoCompra } from '@/lib/types/database'
import { formatCurrency, formatPercent, calcSavingAbsoluto, calcSavingPercentual, calcLeadTimeDays } from '@/lib/utils/kpi-calculations'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts'
import { Clock, ShoppingCart, AlertTriangle, DollarSign, Users, Calendar, Banknote } from 'lucide-react'

export default function AnalyticsPage() {
    const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
    const [compradores, setCompradores] = useState<{ id: string; nome: string }[]>([])
    const [obrasEng, setObrasEng] = useState<{ codigo_uau: string | null; nome: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [mesFiltro, setMesFiltro] = useState('')
    const supabase = createClient()

    useEffect(() => { loadData() }, [])

    async function loadData() {
        const { data } = await supabase
            .from('pedidos_compra')
            .select('*, obra:obras(*), comprador:compradores(*)')
        if (data) setPedidos(data as unknown as PedidoCompra[])
        // Apenas compradores cadastrados e ativos (vinculados aos e-mails)
        const { data: comps } = await supabase
            .from('compradores')
            .select('id, nome')
            .eq('ativo', true)
            .order('nome')
        if (comps) setCompradores(comps as { id: string; nome: string }[])
        // Obras cadastradas no módulo Obras (aba Obras) — base do ranking de urgentes
        const { data: oe } = await supabase.from('obras_eng').select('codigo_uau, nome')
        if (oe) setObrasEng(oe as { codigo_uau: string | null; nome: string }[])
        setLoading(false)
    }

    // Filtra os pedidos pela data de criação se houver mesFiltro ativo (para KPIs gerais)
    const filteredPedidos = pedidos.filter(p => {
        if (!mesFiltro) return true;
        return p.created_at?.startsWith(mesFiltro);
    })

    // KPI calculations - Saving usa a mesma lógica da base unificada
    const pedidosComSaving = pedidos.filter(p => {
        if (!p.valor_orcado || !p.valor_fechado) return false;
        if (!mesFiltro) return true;
        const dataRef = p.data_ordem_compra || p.created_at;
        return dataRef?.startsWith(mesFiltro);
    })
    const valorTotalFechado = pedidosComSaving.reduce((sum, p) => sum + (p.valor_fechado || 0), 0)

    // Lead Time = dias do pedido gerado (data_requisicao) até a ordem gerada
    // (data_ordem_gerada). Conta SÓ os compradores Juliana e Everaldo (pelo
    // comprador do UAU que gerou a OC); ignora AMANDA, LUIS e os demais.
    const ehCompradorAlvo = (p: PedidoCompra) => {
        const nome = (p.comprador_uau || '').toLowerCase()
        return nome.includes('juliana') || nome.includes('everaldo')
    }
    const pedidosLeadTime = pedidos.filter(p => {
        if (!ehCompradorAlvo(p)) return false
        if (!p.data_requisicao || !p.data_ordem_gerada) return false
        if (!mesFiltro) return true
        return p.data_ordem_gerada.startsWith(mesFiltro)
    })
    const leadTimeMedio = pedidosLeadTime.length > 0
        ? pedidosLeadTime.reduce((sum, p) => sum + Math.max(0, calcLeadTimeDays(p.data_requisicao!, p.data_ordem_gerada!) || 0), 0) / pedidosLeadTime.length
        : 0

    const totalEmergenciais = filteredPedidos.filter(p => p.emergencial).length
    const percentEmergenciais = filteredPedidos.length > 0 ? (totalEmergenciais / filteredPedidos.length) * 100 : 0

    // ====== BASE UNIFICADA: pedidos com valor_orcado E valor_fechado (qualquer etapa) ======
    // Filtro de mês: usa data_ordem_compra se existir, senão created_at como fallback
    const pedidosComValores = pedidos.filter(p => {
        if (!p.valor_orcado || !p.valor_fechado) return false;
        if (!mesFiltro) return true;
        const dataRef = p.data_ordem_compra || p.created_at;
        return dataRef?.startsWith(mesFiltro);
    })

    // ── Gráficos por comprador: APENAS compradores cadastrados (vinculados aos
    //    e-mails). Todos os cadastrados aparecem, mesmo sem dados; "Sem comprador"
    //    e compradores não cadastrados são ignorados. ──
    // Pedidos do mês (qualquer status) para o volume de cotações
    const pedidosDoMes = pedidos.filter(p => !mesFiltro || (p.data_ordem_compra || p.created_at)?.startsWith(mesFiltro))

    const savingPorComprador: Record<string, { nome: string; saving: number; cotacoes: number }> = {}
    compradores.forEach(c => { savingPorComprador[c.id] = { nome: c.nome, saving: 0, cotacoes: 0 } })
    pedidosComValores.forEach(p => {
        if (!p.comprador_id || !savingPorComprador[p.comprador_id]) return
        savingPorComprador[p.comprador_id].saving += calcSavingAbsoluto(p.valor_orcado, p.valor_fechado) || 0
    })
    // Volume de cotações = todos os pedidos do comprador (no mês filtrado)
    pedidosDoMes.forEach(p => {
        if (!p.comprador_id || !savingPorComprador[p.comprador_id]) return
        savingPorComprador[p.comprador_id].cotacoes += 1
    })
    const savingCompradorData = Object.values(savingPorComprador).sort((a, b) => b.saving - a.saving)

    // Ordens geradas e valor fechado por comprador: SÓ Juliana e Everaldo (pelo
    // comprador do UAU que gerou a OC). Base: pedidos com data_ordem_gerada no período.
    const ordemGeradaData = [
        { key: 'juliana', nome: 'Juliana' },
        { key: 'everaldo', nome: 'Everaldo' },
    ].map(c => {
        const doComprador = pedidos.filter(p => {
            if (!(p.comprador_uau || '').toLowerCase().includes(c.key)) return false
            if (!p.data_ordem_gerada) return false
            if (!mesFiltro) return true
            return p.data_ordem_gerada.startsWith(mesFiltro)
        })
        return {
            nome: c.nome,
            ordens: doComprador.length,
            valorFechado: doComprador.reduce((s, p) => s + (p.valor_fechado || 0), 0),
        }
    })

    // Top 3 obras com pedidos urgentes: % de urgentes sobre os pedidos da obra,
    // em qualquer coluna EXCETO "Compras Diretas" (grupo OC sem pedido+cotação+OC
    // completos — mesma regra do board). Cada pedido é 1 registro e conta UMA vez,
    // desde que entra em Pedido Confirmado — mudar de coluna não duplica nem
    // remove da conta. Só obras cadastradas na aba Obras do módulo Obras.
    const topUrgentes = (() => {
        const codigosValidos = new Set(obrasEng.map(o => (o.codigo_uau || '').trim().toUpperCase()).filter(Boolean))
        const tem = (v: string | null | undefined) => v != null && String(v).trim() !== ''
        const ehCompraDireta = (p: PedidoCompra) =>
            ['aprovado', 'ordem_gerada', 'em_transito', 'aguardando_entrega', 'entregue'].includes(p.status_fsm || '') &&
            !(tem(p.numero_pedido) && tem(p.categoria_cap) && tem(p.numero_ordem_compra))
        const porObra: Record<string, { codigo: string; nome: string; urgentes: number; total: number }> = {}
        for (const p of filteredPedidos) {
            if (ehCompraDireta(p)) continue
            const cod = (p.codigo_uau || '').trim().toUpperCase()
            if (!cod || !codigosValidos.has(cod)) continue
            if (!porObra[cod]) {
                const oe = obrasEng.find(o => (o.codigo_uau || '').trim().toUpperCase() === cod)
                porObra[cod] = { codigo: cod, nome: oe?.nome || cod, urgentes: 0, total: 0 }
            }
            porObra[cod].total++
            if (p.emergencial) porObra[cod].urgentes++
        }
        return Object.values(porObra)
            .filter(o => o.urgentes > 0)
            .sort((a, b) => (b.urgentes / b.total) - (a.urgentes / a.total) || b.urgentes - a.urgentes)
            .slice(0, 3)
    })()

    // Desconto mensal (sempre mostrar evolução total ou filtrar pelo mês selecionado - evolução geralmente não usa o filtro de 1 mês, mas manteremos coerente)
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
    filteredPedidos.forEach(p => {
        if (!p.valor_fechado) return
        
        const nomeDaObra = p.obra?.nome || 'Sem obra atribuída'
        if (!comprasPorObra[nomeDaObra]) comprasPorObra[nomeDaObra] = { nome: nomeDaObra, valorTotal: 0 }
        comprasPorObra[nomeDaObra].valorTotal += p.valor_fechado
    })
    const comprasObraData = Object.values(comprasPorObra).sort((a, b) => b.valorTotal - a.valorTotal)

    // Emergencial pie
    const pieData = [
        { name: 'Planejada', value: filteredPedidos.length - totalEmergenciais },
        { name: 'Emergencial', value: totalEmergenciais },
    ]
    const PIE_COLORS = ['#10b981', '#ef4444']

    // Data for new Transições Chart
    // Uses the full 'pedidos' array so we can count transitions that happened in 'mesFiltro'
    // regardless of when the 'created_at' was.
    const countTransitions = (dateField: keyof PedidoCompra) => {
        return pedidos.filter(p => {
            const val = p[dateField] as string | null;
            if (!val) return false;
            if (!mesFiltro) return true;
            return val.startsWith(mesFiltro);
        }).length;
    }

    // "Ordem Gerada" = cards que estão na coluna Ordem Gerada do board (mesmos
    // status agrupados lá), não a data da transição. Respeita o filtro de mês.
    const STATUS_ORDEM_GERADA = ['aprovado', 'ordem_gerada', 'em_transito', 'aguardando_entrega', 'entregue'];
    const countOrdemGerada = pedidos.filter(p => {
        if (!STATUS_ORDEM_GERADA.includes(p.status_fsm || '')) return false;
        if (!mesFiltro) return true;
        return (p.data_ordem_compra || p.created_at)?.startsWith(mesFiltro) ?? false;
    }).length;

    const transicoesData = [
        { name: 'Pedido Confirmado', count: countTransitions('data_requisicao') },
        { name: 'Ordem Gerada', count: countOrdemGerada },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: 'var(--text-muted)' }}>
                Carregando dados...
            </div>
        )
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Dashboard de KPIs</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Indicadores de desempenho do setor de suprimentos</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Filtrar Mês:</label>
                    <input 
                        type="month" 
                        value={mesFiltro} 
                        onChange={(e) => setMesFiltro(e.target.value)} 
                        className="input-field"
                        style={{ width: 'auto', padding: '8px 12px', height: '36px' }}
                    />
                    {mesFiltro && (
                        <button 
                            onClick={() => setMesFiltro('')}
                            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer', height: '36px', fontWeight: 600 }}
                        >
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="kpi-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Banknote size={18} style={{ color: '#3b82f6' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Valor Fechado Total</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 800, color: '#3b82f6' }}>{formatCurrency(valorTotalFechado)}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Em {pedidosComSaving.length} pedidos c/ valores</p>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={18} style={{ color: 'var(--accent-blue)' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Lead Time Médio</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 800 }}>{leadTimeMedio.toFixed(0)} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>dias</span></p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{pedidosLeadTime.length} ordens · Juliana/Everaldo</p>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShoppingCart size={18} style={{ color: 'var(--accent-purple)' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total de Pedidos</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 800 }}>{filteredPedidos.length}</p>
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
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{totalEmergenciais} de {filteredPedidos.length} pedidos</p>
                </div>
            </div>

            {/* Transições de Status */}
            <div style={{ marginBottom: '16px' }}>
                <div className="chart-container">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} style={{ color: 'var(--accent-blue)' }} />
                        Volume de Transições de Status {mesFiltro ? `em ${mesFiltro.split('-').reverse().join('/')}` : '(Geral)'}
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={transicoesData} margin={{ left: 0, right: 20, top: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} interval={0} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '12px' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="count" name="Pedidos" radius={[4, 4, 0, 0]} barSize={50}>
                                <LabelList 
                                    dataKey="count" 
                                    position="top" 
                                    content={(props: any) => {
                                        const { x, y, width, value, index } = props;
                                        if (value === 0) return null;
                                        const colors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#14b8a6'];
                                        return (
                                            <text x={x + width / 2} y={y - 8} fill={colors[index % colors.length]} textAnchor="middle" fontSize={12} fontWeight={800}>
                                                {value}
                                            </text>
                                        );
                                    }}
                                />
                                {transicoesData.map((entry, index) => {
                                    const colors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#14b8a6']
                                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                {/* Ordem Gerada por Comprador */}
                <div className="chart-container">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} style={{ color: 'var(--accent-purple)' }} />
                        Volume de Ordem Gerada por Comprador {mesFiltro ? `em ${mesFiltro.split('-').reverse().join('/')}` : '(Geral)'}
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={ordemGeradaData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={10} />
                            <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '12px' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                formatter={(value) => [value, 'Ordens geradas']}
                            />
                            <Bar dataKey="ordens" fill="url(#purpleGradient)" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="ordens" position="top" fill="var(--text-secondary)" fontSize={12} fontWeight={700} />
                            </Bar>
                            <defs>
                                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Valor Fechado por Comprador */}
                <div className="chart-container">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Banknote size={16} style={{ color: 'var(--accent-green)' }} />
                        Valor Fechado por Comprador {mesFiltro ? `em ${mesFiltro.split('-').reverse().join('/')}` : '(Geral)'}
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={ordemGeradaData} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={10} />
                            <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '12px' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                formatter={(value) => [formatCurrency(value as number), 'Valor fechado']}
                            />
                            <Bar dataKey="valorFechado" fill="url(#greenGradientVF)" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="valorFechado" position="top" fill="var(--accent-green)" fontSize={11} fontWeight={700} formatter={(v: any) => formatCurrency(Number(v))} />
                            </Bar>
                            <defs>
                                <linearGradient id="greenGradientVF" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#059669" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top 3 Obras — Pedidos Urgentes */}
                <div className="chart-container">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} />
                        Top 3 Obras — Pedidos Urgentes {mesFiltro ? `em ${mesFiltro.split('-').reverse().join('/')}` : '(Geral)'}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-10px', marginBottom: '16px' }}>
                        % de urgentes sobre todos os pedidos da obra — cada pedido conta uma vez, desde a entrada
                    </p>
                    {topUrgentes.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Nenhum pedido urgente em Pedido Confirmado. 🎉
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {topUrgentes.map((o, i) => {
                                const pct = (o.urgentes / o.total) * 100
                                const medalha = ['🥇', '🥈', '🥉'][i]
                                const cor = i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#6366f1'
                                return (
                                    <div key={o.codigo}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', gap: '10px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {medalha} {o.nome} <span style={{ color: 'var(--accent-blue-light, #818cf8)', fontWeight: 700 }}>({o.codigo})</span>
                                            </span>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: cor, whiteSpace: 'nowrap' }}>
                                                {pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                                                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '6px' }}>{o.urgentes} de {o.total}</span>
                                            </span>
                                        </div>
                                        <div style={{ height: '8px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: cor, borderRadius: '5px' }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
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

