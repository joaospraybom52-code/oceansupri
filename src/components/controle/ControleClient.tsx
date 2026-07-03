'use client'

import { useMemo, useState } from 'react'
import {
    LineChart as RLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Plus, X, LineChart, Wallet, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
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
    tipo: string // 'previsao' | 'emitida'
    nota_fiscal: string | null
    observacoes: string | null
    percentual_recebido: number | null
    mes_recebimento_real: string | null
    iss_percentual: number | null
    inss_percentual: number | null
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

const toYm = (d: string | null) => (d || '').slice(0, 7)
const ymLabel = (ym: string) => {
    const [y, m] = ym.split('-')
    return `${MESES[parseInt(m) - 1] ?? '?'}/${y.slice(2)}`
}

// estágio derivado de cada medição
// Lê valor em pt-BR ("142.321,21" -> 142321.21).
const parseBRL = (raw: string) => parseFloat(String(raw).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
const fmtNum = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const isRecebida = (m: Medicao) => m.percentual_recebido != null
// Valor líquido da nota = bruto menos ISS e INSS (impostos da nota de serviço)
const valorLiquido = (m: Medicao) => Number(m.valor_medicao || 0) * (1 - ((Number(m.iss_percentual || 0) + Number(m.inss_percentual || 0)) / 100))
const temImposto = (m: Medicao) => (Number(m.iss_percentual || 0) + Number(m.inss_percentual || 0)) > 0
const valorRecebido = (m: Medicao) => valorLiquido(m) * (Number(m.percentual_recebido || 0) / 100)
// Valor que deixou de receber por antecipação = diferença entre 100% e o % recebido (sobre o líquido)
const valorDesconto = (m: Medicao) => valorLiquido(m) * ((100 - Number(m.percentual_recebido || 0)) / 100)
const statusInfo = (m: Medicao) => {
    if (isRecebida(m)) return { label: `Recebida ${Number(m.percentual_recebido).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, color: '#10b981' }
    if (m.tipo === 'emitida') return { label: 'Emitida', color: '#f59e0b' }
    return { label: 'Previsão', color: '#6366f1' }
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
    const [filtroDe, setFiltroDe] = useState('')
    const [filtroAte, setFiltroAte] = useState('')

    // Aba do painel da direita: previsão / a receber / recebidas / descontos por antecipação
    const [aba, setAba] = useState<'previsao' | 'aReceber' | 'recebidas' | 'descontos'>('aReceber')

    // Modal cadastro/edição
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ tipo: 'previsao', obra_id: '', valor: '', mes: '', nota_fiscal: '', observacoes: '', iss: '', inss: '' })
    const obraSelecionada = obras.find(o => o.id === form.obra_id) || null

    // Modal recebimento
    const [showReceb, setShowReceb] = useState(false)
    const [recebMed, setRecebMed] = useState<Medicao | null>(null)
    const [recebForm, setRecebForm] = useState({ valorRecebido: '', mesReal: '' })

    function abrirCadastro() {
        setEditId(null)
        setForm({ tipo: 'previsao', obra_id: '', valor: '', mes: '', nota_fiscal: '', observacoes: '', iss: '', inss: '' })
        setShowModal(true)
    }

    function abrirEdicao(m: Medicao) {
        setEditId(m.id)
        setForm({
            tipo: m.tipo || 'previsao',
            obra_id: m.obra_id ?? '',
            valor: String(m.valor_medicao ?? ''),
            mes: toYm(m.mes_recebimento),
            nota_fiscal: m.nota_fiscal ?? '',
            observacoes: m.observacoes ?? '',
            iss: m.iss_percentual != null ? (Number(m.valor_medicao || 0) * Number(m.iss_percentual) / 100).toFixed(2) : '',
            inss: m.inss_percentual != null ? (Number(m.valor_medicao || 0) * Number(m.inss_percentual) / 100).toFixed(2) : '',
        })
        setShowModal(true)
    }

    function abrirRecebimento(m: Medicao) {
        setRecebMed(m)
        // Pré-preenche com o valor recebido (base = líquido). Novo recebimento
        // parte de 100% = valor líquido cheio.
        const base = valorLiquido(m)
        const pct = m.percentual_recebido != null ? Number(m.percentual_recebido) : 100
        const inicial = base * (pct / 100)
        setRecebForm({
            valorRecebido: inicial ? fmtNum(inicial) : '',
            mesReal: toYm(m.mes_recebimento_real) || toYm(m.mes_recebimento),
        })
        setShowReceb(true)
    }

    async function handleExcluir(m: Medicao) {
        if (!window.confirm(`Excluir a medição de ${m.obra?.nome ?? 'obra'} (${formatCurrency(Number(m.valor_medicao))})?`)) return
        const { error } = await supabase.from('controle_medicoes').delete().eq('id', m.id)
        if (error) toast.error('Erro ao excluir: ' + error.message)
        else { setMedicoes(medicoes.filter(x => x.id !== m.id)); toast.success('Medição excluída!') }
    }

    async function handleSalvar(e: React.FormEvent) {
        e.preventDefault()
        if (!form.obra_id || !form.valor || !form.mes) { toast.error('Preencha obra, valor e mês.'); return }
        setLoading(true)
        const payload: any = {
            obra_id: form.obra_id,
            valor_medicao: Number(form.valor),
            mes_recebimento: `${form.mes}-01`,
            tipo: form.tipo,
            nota_fiscal: form.tipo === 'emitida' ? (form.nota_fiscal || null) : null,
            observacoes: form.tipo === 'emitida' ? (form.observacoes || null) : null,
            // ISS/INSS digitados em R$ -> convertidos para % do valor da medição (é como o banco guarda).
            iss_percentual: form.tipo === 'emitida' && form.iss !== '' && Number(form.valor) > 0 ? (Number(form.iss) / Number(form.valor)) * 100 : null,
            inss_percentual: form.tipo === 'emitida' && form.inss !== '' && Number(form.valor) > 0 ? (Number(form.inss) / Number(form.valor)) * 100 : null,
        }
        const sel = 'id, obra_id, valor_medicao, mes_recebimento, tipo, nota_fiscal, observacoes, percentual_recebido, mes_recebimento_real, iss_percentual, inss_percentual, created_at'
        if (editId) {
            const { data, error } = await supabase.from('controle_medicoes').update(payload).eq('id', editId).select(sel).single()
            if (error) toast.error('Erro ao salvar: ' + error.message)
            else {
                setMedicoes(medicoes.map(m => m.id === editId ? { ...(data as any), obra: obraSelecionada } : m))
                toast.success('Medição atualizada!'); fecharCadastro()
            }
        } else {
            const { data, error } = await supabase.from('controle_medicoes').insert(payload).select(sel).single()
            if (error) toast.error('Erro ao salvar: ' + error.message)
            else { setMedicoes([...medicoes, { ...(data as any), obra: obraSelecionada }]); toast.success('Medição cadastrada!'); fecharCadastro() }
        }
        setLoading(false)
    }

    function fecharCadastro() {
        setShowModal(false); setEditId(null)
        setForm({ tipo: 'previsao', obra_id: '', valor: '', mes: '', nota_fiscal: '', observacoes: '', iss: '', inss: '' })
    }

    async function handleConfirmarRecebimento(e: React.FormEvent) {
        e.preventDefault()
        if (!recebMed || !recebForm.valorRecebido || !recebForm.mesReal) { toast.error('Informe o valor recebido e o mês real.'); return }
        const base = valorLiquido(recebMed)
        const valor = parseBRL(recebForm.valorRecebido)
        if (isNaN(valor) || valor < 0) { toast.error('Valor recebido inválido.'); return }
        // Converte o valor recebido em % do líquido (é assim que o sistema guarda).
        const percentual = base > 0 ? (valor / base) * 100 : 0
        setLoading(true)
        const payload = { percentual_recebido: percentual, mes_recebimento_real: `${recebForm.mesReal}-01` }
        const sel = 'id, obra_id, valor_medicao, mes_recebimento, tipo, nota_fiscal, observacoes, percentual_recebido, mes_recebimento_real, created_at'
        const { data, error } = await supabase.from('controle_medicoes').update(payload).eq('id', recebMed.id).select(sel).single()
        if (error) toast.error('Erro: ' + error.message)
        else {
            setMedicoes(medicoes.map(m => m.id === recebMed.id ? { ...(data as any), obra: recebMed.obra } : m))
            toast.success('Recebimento confirmado!'); setShowReceb(false); setRecebMed(null)
        }
        setLoading(false)
    }

    const medicoesFiltradas = useMemo(() => medicoes.filter(m => {
        if (filtroCodigo && m.obra?.codigo !== filtroCodigo) return false
        const refYm = isRecebida(m) ? toYm(m.mes_recebimento_real) : toYm(m.mes_recebimento)
        if (filtroDe && refYm < filtroDe) return false
        if (filtroAte && refYm > filtroAte) return false
        return true
    }), [medicoes, filtroCodigo, filtroDe, filtroAte])

    // Gráfico: 3 séries por mês (previsto / emitida / recebido)
    const chartData = useMemo(() => {
        const map: Record<string, { previsto?: number; emitida?: number; recebido?: number }> = {}
        const add = (ym: string, key: 'previsto' | 'emitida' | 'recebido', v: number) => {
            if (!ym) return
            map[ym] = map[ym] || {}
            map[ym][key] = (map[ym][key] || 0) + v
        }
        for (const m of medicoesFiltradas) {
            if (isRecebida(m)) add(toYm(m.mes_recebimento_real), 'recebido', valorRecebido(m))
            else if (m.tipo === 'emitida') add(toYm(m.mes_recebimento), 'emitida', valorLiquido(m))
            else add(toYm(m.mes_recebimento), 'previsto', valorLiquido(m))
        }
        return Object.keys(map).sort().map(ym => ({ ym, label: ymLabel(ym), ...map[ym] }))
    }, [medicoesFiltradas])

    // KPIs: "A receber" = só nota emitida ainda não recebida; "Já recebido" = o que foi recebido
    const totalAReceber = medicoesFiltradas.filter(m => m.tipo === 'emitida' && !isRecebida(m)).reduce((s, m) => s + valorLiquido(m), 0)
    const totalRecebido = medicoesFiltradas.filter(isRecebida).reduce((s, m) => s + valorRecebido(m), 0)

    // Listas por aba do painel da direita
    const previsoes = medicoesFiltradas.filter(m => !isRecebida(m) && m.tipo !== 'emitida')
    const aReceberLista = medicoesFiltradas.filter(m => !isRecebida(m) && m.tipo === 'emitida')
    const recebidas = medicoesFiltradas.filter(isRecebida)
    const comDesconto = recebidas.filter(m => Number(m.percentual_recebido) < 100)
    const listaAba = aba === 'previsao' ? previsoes : aba === 'recebidas' ? recebidas : aba === 'descontos' ? comDesconto : aReceberLista
    const valorDaLinha = (m: Medicao) => aba === 'descontos' ? valorDesconto(m) : aba === 'recebidas' ? valorRecebido(m) : valorLiquido(m)
    const totalAba = listaAba.reduce((s, m) => s + valorDaLinha(m), 0)
    const corAba = aba === 'descontos' ? 'var(--accent-red, #ef4444)' : aba === 'previsao' ? '#6366f1' : 'var(--accent-green)'

    const limparFiltros = () => { setFiltroCodigo(''); setFiltroDe(''); setFiltroAte('') }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Previsão de Recebimentos</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Previsão, nota emitida e recebimento confirmado por mês</p>
                </div>
                {podeEditar && (
                    <button onClick={abrirCadastro} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Cadastrar Medição
                    </button>
                )}
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <KpiCard icon={Wallet} color="#f59e0b" label="A receber (nota emitida)" value={formatCurrency(totalAReceber)} />
                <KpiCard icon={CheckCircle2} color="#10b981" label="Já recebido (filtro)" value={formatCurrency(totalRecebido)} />
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
                {(filtroCodigo || filtroDe || filtroAte) && <button onClick={limparFiltros} className="btn-secondary">Limpar filtros</button>}
            </div>

            {/* Gráfico + Tabela */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
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
                        <>
                            <ResponsiveContainer width="100%" height={320}>
                                <RLineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} dy={8} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatCurrencyShort} width={70} />
                                    <Tooltip
                                        cursor={{ stroke: 'rgba(255,255,255,0.1)' }} isAnimationActive={false}
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null
                                            const nomes: Record<string, string> = { previsto: 'Previsão', emitida: 'Emitida', recebido: 'Recebido' }
                                            return (
                                                <div style={tooltipStyle}>
                                                    <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>{label}</p>
                                                    {payload.map((p: any, i: number) => (
                                                        <p key={i} style={{ margin: '2px 0', fontSize: '13px', color: p.color }}>
                                                            {nomes[p.dataKey] ?? p.dataKey}: <strong style={{ color: '#f1f5f9' }}>{formatCurrency(Number(p.value ?? 0))}</strong>
                                                        </p>
                                                    ))}
                                                </div>
                                            )
                                        }}
                                    />
                                    <Line type="monotone" dataKey="previsto" stroke="#6366f1" strokeWidth={3} strokeDasharray="6 5" connectNulls
                                        dot={{ r: 4, fill: '#111128', stroke: '#6366f1', strokeWidth: 2 }} />
                                    <Line type="monotone" dataKey="emitida" stroke="#f59e0b" strokeWidth={3} connectNulls
                                        dot={{ r: 4, fill: '#111128', stroke: '#f59e0b', strokeWidth: 2 }} />
                                    <Line type="monotone" dataKey="recebido" stroke="#10b981" strokeWidth={3} connectNulls
                                        dot={{ r: 4, fill: '#111128', stroke: '#10b981', strokeWidth: 2 }} />
                                </RLineChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
                                <Legenda cor="#6366f1" texto="Previsão" tracejado />
                                <Legenda cor="#f59e0b" texto="Emitida" />
                                <Legenda cor="#10b981" texto="Recebido" />
                            </div>
                        </>
                    )}
                </div>

                {/* Tabela com abas */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    {/* Abas */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <AbaBtn ativa={aba === 'previsao'} cor="#6366f1" label="Previsão" qtd={previsoes.length} onClick={() => setAba('previsao')} />
                        <AbaBtn ativa={aba === 'aReceber'} cor="#f59e0b" label="A receber" qtd={aReceberLista.length} onClick={() => setAba('aReceber')} />
                        <AbaBtn ativa={aba === 'recebidas'} cor="#10b981" label="Notas recebidas" qtd={recebidas.length} onClick={() => setAba('recebidas')} />
                        <AbaBtn ativa={aba === 'descontos'} cor="#ef4444" label="Desconto antecipação" qtd={comDesconto.length} onClick={() => setAba('descontos')} />
                    </div>
                    {aba === 'descontos' && (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '-8px 0 12px' }}>
                            Valor que deixou de receber em cada nota recebida abaixo de 100%.
                        </p>
                    )}
                    {listaAba.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            {aba === 'previsao' ? 'Nenhuma previsão no filtro.' : aba === 'recebidas' ? 'Nenhuma nota recebida no filtro.' : aba === 'descontos' ? 'Nenhum desconto por antecipação no filtro.' : 'Nenhuma nota a receber no filtro.'}
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                            {listaAba.map(m => {
                                const st = statusInfo(m)
                                return (
                                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', gap: '8px' }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.obra?.nome ?? '—'}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span>
                                                <span>· {m.obra?.codigo}{m.obra?.cidade ? ` · ${m.obra.cidade}` : ''} · {ymLabel(toYm(isRecebida(m) ? m.mes_recebimento_real : m.mes_recebimento))}</span>
                                                {m.nota_fiscal && <span>· NF {m.nota_fiscal}</span>}
                                                {temImposto(m) && aba !== 'descontos' && <span>· líq. de {formatCurrency(Number(m.valor_medicao))} (− ISS {formatCurrency(Number(m.valor_medicao) * Number(m.iss_percentual || 0) / 100)} − INSS {formatCurrency(Number(m.valor_medicao) * Number(m.inss_percentual || 0) / 100)})</span>}
                                                {aba === 'descontos' && <span>· de {formatCurrency(Number(m.valor_medicao))}</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: corAba, whiteSpace: 'nowrap' }}>
                                                {aba === 'descontos' ? '− ' : ''}{formatCurrency(valorDaLinha(m))}
                                            </span>
                                            {podeEditar && (
                                                <>
                                                    <button onClick={() => abrirRecebimento(m)} title={isRecebida(m) ? 'Ajustar recebimento' : 'Confirmar recebimento'} style={{ ...iconBtnStyle, color: '#10b981' }}><CheckCircle2 size={14} /></button>
                                                    <button onClick={() => abrirEdicao(m)} title="Editar" style={iconBtnStyle}><Pencil size={14} /></button>
                                                    <button onClick={() => handleExcluir(m)} title="Excluir" style={{ ...iconBtnStyle, color: 'var(--accent-red, #ef4444)' }}><Trash2 size={14} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', marginTop: '12px', paddingTop: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {aba === 'previsao' ? 'Total previsto' : aba === 'descontos' ? 'Total deixado de receber' : aba === 'recebidas' ? 'Total recebido' : 'Total a receber'}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: corAba }}>{aba === 'descontos' ? '− ' : ''}{formatCurrency(totalAba)}</span>
                    </div>
                </div>
            </div>

            {/* Modal Cadastro/Edição */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{editId ? 'Editar Medição' : 'Cadastrar Medição'}</h3>
                            <button onClick={fecharCadastro} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Tipo */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <TipoBtn ativo={form.tipo === 'previsao'} cor="#6366f1" label="Previsão futura" onClick={() => setForm({ ...form, tipo: 'previsao' })} />
                                <TipoBtn ativo={form.tipo === 'emitida'} cor="#f59e0b" label="Nota emitida" onClick={() => setForm({ ...form, tipo: 'emitida' })} />
                            </div>

                            <div>
                                <label style={lbl}>Obra *</label>
                                <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className="select-field" required>
                                    <option value="">Selecione a obra</option>
                                    {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>)}
                                </select>
                            </div>

                            {obraSelecionada && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div><label style={lbl}>Código UAU</label><input value={obraSelecionada.codigo ?? '—'} className="input-field" disabled /></div>
                                    <div><label style={lbl}>Cidade</label><input value={obraSelecionada.cidade ?? '—'} className="input-field" disabled /></div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label style={lbl}>Valor da medição *</label><input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="input-field" placeholder="0,00" required /></div>
                                <div><label style={lbl}>Mês previsto *</label><input type="month" value={form.mes} onChange={e => setForm({ ...form, mes: e.target.value })} className="input-field" required /></div>
                            </div>

                            {form.tipo === 'emitida' && (
                                <>
                                    <div><label style={lbl}>Nota fiscal</label><input type="text" value={form.nota_fiscal} onChange={e => setForm({ ...form, nota_fiscal: e.target.value })} className="input-field" placeholder="Nº da NF" /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div><label style={lbl}>ISS (R$)</label><input type="number" step="0.01" min="0" value={form.iss} onChange={e => setForm({ ...form, iss: e.target.value })} className="input-field" placeholder="Ex: 500,00" /></div>
                                        <div><label style={lbl}>INSS (R$)</label><input type="number" step="0.01" min="0" value={form.inss} onChange={e => setForm({ ...form, inss: e.target.value })} className="input-field" placeholder="Ex: 1.100,00" /></div>
                                    </div>
                                    {(form.iss || form.inss) && form.valor && Number(form.valor) > 0 && (
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '-4px 0 0' }}>
                                            ISS: <strong style={{ color: 'var(--text-secondary)' }}>{(Number(form.iss || 0) / Number(form.valor) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</strong>
                                            {' · '}INSS: <strong style={{ color: 'var(--text-secondary)' }}>{(Number(form.inss || 0) / Number(form.valor) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</strong>
                                            {' · '}Líquido: <strong style={{ color: 'var(--accent-green)' }}>{formatCurrency(Number(form.valor) - Number(form.iss || 0) - Number(form.inss || 0))}</strong>
                                        </p>
                                    )}
                                    <div><label style={lbl}>Observações</label><textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="input-field" rows={2} placeholder="Observações" /></div>
                                </>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button type="button" onClick={fecharCadastro} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Recebimento */}
            {showReceb && recebMed && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Confirmar Recebimento</h3>
                            <button onClick={() => { setShowReceb(false); setRecebMed(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            {recebMed.obra?.nome} — {formatCurrency(Number(recebMed.valor_medicao))}{recebMed.nota_fiscal ? ` · NF ${recebMed.nota_fiscal}` : ''}
                        </p>
                        <form onSubmit={handleConfirmarRecebimento} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label style={lbl}>Valor recebido (R$) *</label><input type="text" inputMode="decimal" value={recebForm.valorRecebido} onChange={e => setRecebForm({ ...recebForm, valorRecebido: e.target.value })} className="input-field" placeholder="0,00" required /></div>
                                <div><label style={lbl}>Mês real *</label><input type="month" value={recebForm.mesReal} onChange={e => setRecebForm({ ...recebForm, mesReal: e.target.value })} className="input-field" required /></div>
                            </div>
                            {recebForm.valorRecebido && valorLiquido(recebMed) > 0 && (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    Equivale a <strong style={{ color: 'var(--accent-green)' }}>{(parseBRL(recebForm.valorRecebido) / valorLiquido(recebMed) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</strong> de {formatCurrency(valorLiquido(recebMed))}{temImposto(recebMed) ? ' (líquido)' : ''}
                                </p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button type="button" onClick={() => { setShowReceb(false); setRecebMed(null) }} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Confirmar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

const lbl: React.CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }

function AbaBtn({ ativa, cor, label, qtd, onClick }: { ativa: boolean; cor: string; label: string; qtd: number; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} style={{
            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600,
            fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '7px',
            background: ativa ? `${cor}22` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${ativa ? cor : 'var(--border-glass)'}`,
            color: ativa ? cor : 'var(--text-secondary)',
        }}>
            {label}
            <span style={{ fontSize: '11px', fontWeight: 700, background: ativa ? cor : 'rgba(255,255,255,0.1)', color: ativa ? '#fff' : 'var(--text-muted)', borderRadius: '10px', padding: '1px 7px' }}>{qtd}</span>
        </button>
    )
}

function TipoBtn({ ativo, cor, label, onClick }: { ativo: boolean; cor: string; label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} style={{
            padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            background: ativo ? `${cor}22` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${ativo ? cor : 'var(--border-glass)'}`,
            color: ativo ? cor : 'var(--text-secondary)',
        }}>{label}</button>
    )
}

function Legenda({ cor, texto, tracejado }: { cor: string; texto: string; tracejado?: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 18, height: 0, borderTop: `3px ${tracejado ? 'dashed' : 'solid'} ${cor}` }} />
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{texto}</span>
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
