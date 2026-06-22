'use client'

import { useMemo, useState } from 'react'
import {
    LineChart as RLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Plus, X, LineChart, TrendingUp, Building2, Wallet, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Obra {
    id: string
    nome: string
    codigo: string | null
    cidade: string | null
}

interface Medicao {
    id: string
    obra_id: string | null
    valor_medicao: number
    mes_recebimento: string // YYYY-MM-DD
    created_at: string | null
    obra: Obra | null
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const formatCurrencyShort = (v: number) => {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`
    return `R$ ${v}`
}

// 'YYYY-MM-DD' | 'YYYY-MM' -> 'YYYY-MM'
const toYm = (d: string) => (d || '').slice(0, 7)
// 'YYYY-MM' -> 'jul/26'
const ymLabel = (ym: string) => {
    const [y, m] = ym.split('-')
    return `${MESES[parseInt(m) - 1] ?? '?'}/${y.slice(2)}`
}

const tooltipStyle: React.CSSProperties = {
    background: 'rgba(17, 17, 40, 0.95)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px',
}

const iconBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '6px',
    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0,
}

export default function ControleClient({ obras, medicoesIniciais, podeEditar }: { obras: Obra[]; medicoesIniciais: Medicao[]; podeEditar: boolean }) {
    const supabase = createClient()
    const [medicoes, setMedicoes] = useState<Medicao[]>(medicoesIniciais)

    // Filtros
    const [filtroCodigo, setFiltroCodigo] = useState('')
    const [filtroDe, setFiltroDe] = useState('')   // YYYY-MM
    const [filtroAte, setFiltroAte] = useState('')  // YYYY-MM

    // Modal cadastro/edição
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ obra_id: '', valor: '', mes: '' })
    const obraSelecionada = obras.find(o => o.id === form.obra_id) || null

    function abrirCadastro() {
        setEditId(null)
        setForm({ obra_id: '', valor: '', mes: '' })
        setShowModal(true)
    }

    function abrirEdicao(m: Medicao) {
        setEditId(m.id)
        setForm({ obra_id: m.obra_id ?? '', valor: String(m.valor_medicao ?? ''), mes: toYm(m.mes_recebimento) })
        setShowModal(true)
    }

    async function handleExcluir(m: Medicao) {
        if (!window.confirm(`Excluir a medição de ${m.obra?.nome ?? 'obra'} (${formatCurrency(Number(m.valor_medicao))})?`)) return
        const { error } = await supabase.from('controle_medicoes').delete().eq('id', m.id)
        if (error) {
            toast.error('Erro ao excluir: ' + error.message)
        } else {
            setMedicoes(medicoes.filter(x => x.id !== m.id))
            toast.success('Medição excluída!')
        }
    }

    const medicoesFiltradas = useMemo(() => {
        return medicoes.filter(m => {
            const ym = toYm(m.mes_recebimento)
            if (filtroCodigo && m.obra?.codigo !== filtroCodigo) return false
            if (filtroDe && ym < filtroDe) return false
            if (filtroAte && ym > filtroAte) return false
            return true
        })
    }, [medicoes, filtroCodigo, filtroDe, filtroAte])

    // Dados do gráfico: soma por mês
    const chartData = useMemo(() => {
        const porMes: Record<string, number> = {}
        for (const m of medicoesFiltradas) {
            const ym = toYm(m.mes_recebimento)
            porMes[ym] = (porMes[ym] || 0) + Number(m.valor_medicao || 0)
        }
        return Object.keys(porMes).sort().map(ym => ({ ym, label: ymLabel(ym), total: porMes[ym] }))
    }, [medicoesFiltradas])

    const totalPeriodo = medicoesFiltradas.reduce((s, m) => s + Number(m.valor_medicao || 0), 0)
    const obrasNoPeriodo = new Set(medicoesFiltradas.map(m => m.obra_id)).size

    // Próximo mês (calendário)
    const proximoMesYm = useMemo(() => {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }, [])
    const totalProximoMes = medicoes
        .filter(m => toYm(m.mes_recebimento) === proximoMesYm)
        .reduce((s, m) => s + Number(m.valor_medicao || 0), 0)

    async function handleSalvar(e: React.FormEvent) {
        e.preventDefault()
        if (!form.obra_id || !form.valor || !form.mes) {
            toast.error('Preencha obra, valor e mês de recebimento.')
            return
        }
        setLoading(true)
        const payload = {
            obra_id: form.obra_id,
            valor_medicao: Number(form.valor),
            mes_recebimento: `${form.mes}-01`,
        }

        if (editId) {
            const { data, error } = await supabase
                .from('controle_medicoes')
                .update(payload)
                .eq('id', editId)
                .select('id, obra_id, valor_medicao, mes_recebimento, created_at')
                .single()
            if (error) {
                toast.error('Erro ao salvar: ' + error.message)
            } else {
                const atualizada: Medicao = { ...(data as any), obra: obraSelecionada }
                setMedicoes(medicoes.map(m => m.id === editId ? atualizada : m))
                toast.success('Medição atualizada!')
                setShowModal(false)
                setEditId(null)
                setForm({ obra_id: '', valor: '', mes: '' })
            }
        } else {
            const { data, error } = await supabase
                .from('controle_medicoes')
                .insert(payload)
                .select('id, obra_id, valor_medicao, mes_recebimento, created_at')
                .single()
            if (error) {
                toast.error('Erro ao salvar: ' + error.message)
            } else {
                const nova: Medicao = { ...(data as any), obra: obraSelecionada }
                setMedicoes([...medicoes, nova])
                toast.success('Medição cadastrada!')
                setShowModal(false)
                setForm({ obra_id: '', valor: '', mes: '' })
            }
        }
        setLoading(false)
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Previsão de Recebimentos</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Quanto vamos receber de medição por mês</p>
                </div>
                {podeEditar && (
                    <button onClick={abrirCadastro} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Cadastrar Medição
                    </button>
                )}
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <KpiCard icon={Wallet} color="#f59e0b" label="Total a receber (filtro)" value={formatCurrency(totalPeriodo)} />
                <KpiCard icon={TrendingUp} color="#10b981" label={`Próximo mês (${ymLabel(proximoMesYm)})`} value={formatCurrency(totalProximoMes)} />
                <KpiCard icon={Building2} color="#6366f1" label="Obras no período" value={String(obrasNoPeriodo)} />
            </div>

            {/* Filtros */}
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Código da obra</label>
                    <select value={filtroCodigo} onChange={e => setFiltroCodigo(e.target.value)} className="select-field" style={{ minWidth: '200px' }}>
                        <option value="">Todas as obras</option>
                        {obras.map(o => <option key={o.id} value={o.codigo ?? ''}>{o.codigo} - {o.nome}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>De (mês)</label>
                    <input type="month" value={filtroDe} onChange={e => setFiltroDe(e.target.value)} className="input-field" />
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Até (mês)</label>
                    <input type="month" value={filtroAte} onChange={e => setFiltroAte(e.target.value)} className="input-field" />
                </div>
                {(filtroCodigo || filtroDe || filtroAte) && (
                    <button onClick={() => { setFiltroCodigo(''); setFiltroDe(''); setFiltroAte('') }} className="btn-secondary">Limpar filtros</button>
                )}
            </div>

            {/* Gráfico + Tabela */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
                {/* Gráfico de linha */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <LineChart size={18} color="#f59e0b" />
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Valores por mês</h3>
                    </div>
                    {chartData.length === 0 ? (
                        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                            Nenhuma medição no filtro atual.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <RLineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                                <defs>
                                    <linearGradient id="ctrlLine" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#f59e0b" />
                                        <stop offset="100%" stopColor="#fbbf24" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} dy={8} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatCurrencyShort} width={70} />
                                <Tooltip
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    isAnimationActive={false}
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload?.length) return null
                                        return (
                                            <div style={tooltipStyle}>
                                                <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>{label}</p>
                                                <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px', margin: 0 }}>{formatCurrency(Number(payload[0].value ?? 0))}</p>
                                            </div>
                                        )
                                    }}
                                />
                                <Line type="monotone" dataKey="total" stroke="url(#ctrlLine)" strokeWidth={3}
                                    dot={{ r: 5, fill: '#111128', stroke: '#f59e0b', strokeWidth: 2 }}
                                    activeDot={{ r: 7, fill: '#f59e0b', stroke: '#111128', strokeWidth: 2 }} />
                            </RLineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Tabela */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Obras a receber</h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{medicoesFiltradas.length} medições</span>
                    </div>
                    {medicoesFiltradas.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Nenhuma medição no filtro atual.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                            {medicoesFiltradas.map(m => (
                                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', gap: '8px' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.obra?.nome ?? '—'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {m.obra?.codigo}{m.obra?.cidade ? ` · ${m.obra.cidade}` : ''} · {ymLabel(toYm(m.mes_recebimento))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-green)', whiteSpace: 'nowrap' }}>{formatCurrency(Number(m.valor_medicao))}</span>
                                        {podeEditar && (
                                            <>
                                                <button onClick={() => abrirEdicao(m)} title="Editar" style={iconBtnStyle}><Pencil size={14} /></button>
                                                <button onClick={() => handleExcluir(m)} title="Excluir" style={{ ...iconBtnStyle, color: 'var(--accent-red, #ef4444)' }}><Trash2 size={14} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', marginTop: '12px', paddingTop: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-green)' }}>{formatCurrency(totalPeriodo)}</span>
                    </div>
                </div>
            </div>

            {/* Modal Cadastrar Medição */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '460px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{editId ? 'Editar Medição' : 'Cadastrar Medição'}</h3>
                            <button onClick={() => { setShowModal(false); setEditId(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Obra *</label>
                                <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className="select-field" required>
                                    <option value="">Selecione a obra</option>
                                    {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>)}
                                </select>
                            </div>

                            {obraSelecionada && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Código UAU</label>
                                        <input value={obraSelecionada.codigo ?? '—'} className="input-field" disabled />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Cidade</label>
                                        <input value={obraSelecionada.cidade ?? '—'} className="input-field" disabled />
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Valor da medição *</label>
                                    <input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="input-field" placeholder="0,00" required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Mês de recebimento *</label>
                                    <input type="month" value={form.mes} onChange={e => setForm({ ...form, mes: e.target.value })} className="input-field" required />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button type="button" onClick={() => { setShowModal(false); setEditId(null) }} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function KpiCard({ icon: Icon, color, label, value }: { icon: React.ElementType; color: string; label: string; value: string }) {
    return (
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} color={color} />
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{value}</div>
            </div>
        </div>
    )
}
