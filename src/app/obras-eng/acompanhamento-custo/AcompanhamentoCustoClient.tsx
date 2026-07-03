'use client'

import { useMemo, useState, useEffect } from 'react'
import { Wallet, X, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SearchSelect from '@/components/ui/SearchSelect'

const ADMIN_EDIT_EMAIL = 'engjoao@constrowins.eng.br'

interface Linha {
    obra_plt: string
    obra: string | null
    item_plt: string | null
    serv_plt: string | null
    servico: string | null
    insumo: string | null
    ins_cins: string | null
    unid_ins: string | null
    valor_aprov: number | null
    saldo_vlr_vinc: number | null
    ordem: number | null
    atualizado_em: string | null
}

interface Orcamento {
    id: string
    obra_plt: string
    item_plt: string
    insumo: string
    valor_planejado: number | null
}

interface Material {
    obra_plt: string
    item_plt: string | null
    ins_cins: string | null
    material: string | null
    valor: number | null
}

type Tipo = 'raiz' | 'subtotal' | 'servico' | 'insumo'
interface DisplayRow {
    tipo: Tipo
    item: string
    descricao: string
    ins_cins: string
    planej: number
    aprov: number
    vinc: number
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const dots = (s: string) => (s.match(/\./g) || []).length

function status(planej: number, saldo: number): { txt: string; bg: string; fg: string } {
    if (!planej) return { txt: '', bg: 'transparent', fg: 'var(--text-muted)' }
    if (saldo <= 0) return { txt: '🔴 Estourado', bg: '#F8CBAD', fg: '#9C0006' }
    if (saldo <= 0.4 * planej) return { txt: '🟠 Alerta', bg: '#FFD966', fg: '#7F6000' }
    return { txt: '🟢 Dentro do custo', bg: '#C6EFCE', fg: '#006100' }
}

const ESTILO: Record<Tipo, React.CSSProperties> = {
    raiz: { background: '#1F4E78', color: '#fff', fontWeight: 700 },
    subtotal: { background: '#9DC3E6', color: '#10243a', fontWeight: 600 },
    servico: { background: '#FFE699', color: '#5a4a00', fontWeight: 600 },
    insumo: { background: 'transparent', color: 'var(--text-secondary)', fontWeight: 400 },
}
const NIVEL: Record<Tipo, number> = { raiz: 0, subtotal: 1, servico: 2, insumo: 3 }

export default function AcompanhamentoCustoClient({ linhas, orcamento, materiais }: { linhas: Linha[]; orcamento: Orcamento[]; materiais: Material[] }) {
    const obras = useMemo(() => {
        const m = new Map<string, string>()
        for (const l of linhas) if (!m.has(l.obra_plt)) m.set(l.obra_plt, l.obra || l.obra_plt)
        return Array.from(m.entries()).map(([codigo, nome]) => ({ codigo, nome }))
    }, [linhas])

    const [obraSel, setObraSel] = useState(obras[0]?.codigo ?? '')
    const [sel, setSel] = useState<{ item: string; descr: string; ins_cins: string } | null>(null)

    // Orçamento mutável (PLANEJADO editável só pelo admin nas linhas de insumo).
    const supabase = createClient()
    const [orc, setOrc] = useState<Orcamento[]>(orcamento)
    const [canEdit, setCanEdit] = useState(false)
    const [salvando, setSalvando] = useState<string | null>(null)
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCanEdit((data.user?.email || '').toLowerCase() === ADMIN_EDIT_EMAIL)
        })
    }, [])

    // Grava o PLANEJADO de um insumo. Atualiza a linha existente do orçamento
    // (casando por item + insumo normalizado) ou insere uma nova. As somas das
    // linhas amarelas (serviço) e azuis (raiz/subtotal) recalculam sozinhas.
    async function salvarPlanejado(item: string, insumoNome: string, raw: string) {
        // Aceita formato pt-BR: "167.392,50" -> 167392.50 (ponto = milhar, vírgula = decimal)
        const valor = parseFloat(String(raw).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
        if (isNaN(valor) || valor < 0) return
        const insumoUpper = insumoNome.trim().toUpperCase()
        const chave = `${item}|${insumoUpper}`
        const existente = orc.find(o => o.obra_plt === obraSel && (o.item_plt || '') === item && (o.insumo || '').trim().toUpperCase() === insumoUpper)
        if (existente && Number(existente.valor_planejado || 0) === valor) return
        setSalvando(chave)
        try {
            if (existente) {
                const anterior = existente.valor_planejado
                setOrc(prev => prev.map(o => o.id === existente.id ? { ...o, valor_planejado: valor } : o))
                const { error } = await supabase.from('custo_orcamento').update({ valor_planejado: valor, atualizado_em: new Date().toISOString() }).eq('id', existente.id)
                if (error) {
                    setOrc(prev => prev.map(o => o.id === existente.id ? { ...o, valor_planejado: anterior } : o))
                    throw error
                }
            } else {
                const { data, error } = await supabase.from('custo_orcamento')
                    .insert({ obra_plt: obraSel, item_plt: item, insumo: insumoNome, valor_planejado: valor })
                    .select('id').single()
                if (error) throw error
                setOrc(prev => [...prev, { id: (data as any).id, obra_plt: obraSel, item_plt: item, insumo: insumoNome, valor_planejado: valor }])
            }
        } catch (e) {
            console.error('Erro ao salvar planejado:', e)
            alert('Não foi possível salvar o valor planejado.')
        } finally {
            setSalvando(null)
        }
    }

    // Modal de confirmação de alteração do planejado.
    const [editando, setEditando] = useState<{ item: string; descricao: string; ins_cins: string; atual: number } | null>(null)
    const [novoValor, setNovoValor] = useState('')
    function abrirEdicao(r: DisplayRow) {
        setEditando({ item: r.item, descricao: r.descricao, ins_cins: r.ins_cins, atual: r.planej })
        setNovoValor(r.planej ? r.planej.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')
    }
    async function confirmarEdicao() {
        if (!editando) return
        await salvarPlanejado(editando.item, editando.descricao, novoValor)
        setEditando(null)
    }

    const materiaisSel = useMemo(() => {
        if (!sel) return []
        return materiais
            .filter(m => m.obra_plt === obraSel && (m.item_plt || '') === sel.item && (m.ins_cins || '') === sel.ins_cins)
            .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))
    }, [materiais, obraSel, sel])
    const totalMateriais = materiaisSel.reduce((s, m) => s + Number(m.valor || 0), 0)

    const { rows, atualizado } = useMemo(() => {
        const ls = linhas.filter(l => l.obra_plt === obraSel)
        const orcObra = orc.filter(o => o.obra_plt === obraSel)
        // Planejado (Excel/orçamento fixo): por insumo e por prefixo de item
        const planejInsumo = new Map<string, number>()
        for (const o of orcObra) planejInsumo.set(`${o.item_plt}|${(o.insumo || '').trim().toUpperCase()}`, Number(o.valor_planejado || 0))
        const planejPrefixo = (p: string) => orcObra.reduce((s, o) => {
            const it = o.item_plt || ''
            return (it === p || it.startsWith(p + '.')) ? s + Number(o.valor_planejado || 0) : s
        }, 0)

        // Custo e Vinculado (SQL/UAU) por serviço (item_plt) entre os insumos
        const servTot: Record<string, { aprov: number; vinc: number; nome: string }> = {}
        for (const l of ls) {
            if (String(l.serv_plt) !== '-1') {
                const k = l.item_plt || ''
                servTot[k] = servTot[k] || { aprov: 0, vinc: 0, nome: l.servico || '' }
                servTot[k].aprov += Number(l.valor_aprov || 0)
                servTot[k].vinc += Number(l.saldo_vlr_vinc || 0)
            }
        }
        const out: DisplayRow[] = []
        let lastServ: string | null = null
        for (const l of ls) {
            const item = l.item_plt || ''
            if (String(l.serv_plt) === '-1') {
                out.push({ tipo: dots(item) === 0 ? 'raiz' : 'subtotal', item, descricao: l.servico || '', ins_cins: '', planej: planejPrefixo(item), aprov: Number(l.valor_aprov || 0), vinc: Number(l.saldo_vlr_vinc || 0) })
                lastServ = null
            } else {
                if (item !== lastServ) {
                    const t = servTot[item]
                    out.push({ tipo: 'servico', item, descricao: t?.nome || l.servico || '', ins_cins: '', planej: planejPrefixo(item), aprov: t?.aprov || 0, vinc: t?.vinc || 0 })
                    lastServ = item
                }
                const planej = planejInsumo.get(`${item}|${(l.insumo || '').trim().toUpperCase()}`) ?? 0
                out.push({ tipo: 'insumo', item, descricao: l.insumo || '', ins_cins: l.ins_cins || '', planej, aprov: Number(l.valor_aprov || 0), vinc: Number(l.saldo_vlr_vinc || 0) })
            }
        }
        const at = ls[0]?.atualizado_em ?? null
        return { rows: out, atualizado: at }
    }, [linhas, orc, obraSel])

    const th: React.CSSProperties = { padding: '10px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--bg-secondary)' }
    const td: React.CSSProperties = { padding: '8px 12px', fontSize: '13px', textAlign: 'right', whiteSpace: 'nowrap' }

    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Wallet size={22} color="#10b981" /> Acompanhamento de Custo
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Orçado × realizado por item (origem: UAU){atualizado ? ` · atualizado em ${new Date(atualizado).toLocaleString('pt-BR')}` : ''}</p>
                    {canEdit && <p style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '2px' }}>✏️ Você pode editar o Planejado das linhas de insumo (sem cor) — os subtotais recalculam automaticamente.</p>}
                </div>
                <SearchSelect
                    options={obras.map(o => ({ value: o.codigo, label: o.nome }))}
                    value={obraSel}
                    onChange={v => { setObraSel(v); setSel(null) }}
                    placeholder="Selecionar obra..."
                    minWidth={300}
                />
            </div>

            {rows.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum dado de custo para esta obra.
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    {/* Tabela de custo (encolhe quando o painel abre) */}
                    <div className="glass-card" style={{ padding: '0', overflow: 'hidden', flex: sel ? '1 1 60%' : '1 1 100%', minWidth: 0 }}>
                        <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...th, textAlign: 'left', width: '90px' }}>Item</th>
                                        <th style={{ ...th, textAlign: 'left' }}>Descrição</th>
                                        <th style={th}>Planejado</th>
                                        <th style={th}>Custo</th>
                                        <th style={th}>Vinculado</th>
                                        <th style={th}>Saldo</th>
                                        <th style={{ ...th, textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => {
                                        const saldo = r.planej - r.aprov - r.vinc
                                        const st = status(r.planej, saldo)
                                        const base = ESTILO[r.tipo]
                                        const clicavel = r.tipo === 'insumo'
                                        const ativo = sel && sel.item === r.item && sel.ins_cins === r.ins_cins
                                        return (
                                            <tr key={i}
                                                onClick={clicavel ? () => setSel(ativo ? null : { item: r.item, descr: r.descricao, ins_cins: r.ins_cins }) : undefined}
                                                style={{ ...base, ...(ativo ? { background: 'rgba(99,102,241,0.22)' } : {}), borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: clicavel ? 'pointer' : 'default' }}>
                                                <td style={{ ...td, textAlign: 'left', fontWeight: r.tipo === 'insumo' ? 400 : 700 }}>{r.item}</td>
                                                <td style={{ ...td, textAlign: 'left', paddingLeft: `${12 + NIVEL[r.tipo] * 16}px`, maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {clicavel && <span style={{ color: 'var(--accent-blue, #818cf8)', marginRight: '6px' }}>›</span>}{r.descricao}
                                                </td>
                                                <td style={td}>
                                                    {r.tipo === 'insumo' && canEdit ? (
                                                        <span
                                                            onClick={e => { e.stopPropagation(); abrirEdicao(r) }}
                                                            title="Clique para alterar o planejado (admin)"
                                                            style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(129,140,248,0.7)', paddingBottom: '1px' }}
                                                        >
                                                            {fmt(r.planej)}
                                                        </span>
                                                    ) : fmt(r.planej)}
                                                </td>
                                                <td style={td}>{fmt(r.aprov)}</td>
                                                <td style={td}>{fmt(r.vinc)}</td>
                                                <td style={td}>{fmt(saldo)}</td>
                                                <td style={{ ...td, textAlign: 'center' }}>
                                                    {st.txt && <span style={{ background: st.bg, color: st.fg, padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>{st.txt}</span>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Painel de materiais do insumo selecionado */}
                    {sel && (
                        <div className="glass-card" style={{ padding: '20px', flex: '1 1 40%', minWidth: 0, maxHeight: '72vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <Package size={18} color="#10b981" />
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Materiais do insumo</h3>
                                </div>
                                <button onClick={() => setSel(null)} title="Fechar" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>{sel.item} · {sel.descr}</p>
                            {materiaisSel.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem materiais lançados para este insumo.</p>
                            ) : (
                                <div style={{ overflowY: 'auto', flex: 1 }}>
                                    {materiaisSel.map((m, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: 0 }}>{m.material}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(Number(m.valor || 0))}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', marginTop: '8px', paddingTop: '12px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Total ({materiaisSel.length})</span>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-green)' }}>{fmt(totalMateriais)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de confirmação de alteração do planejado */}
            {editando && (
                <div onClick={() => setEditando(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div onClick={e => e.stopPropagation()} className="glass-card" style={{ padding: '24px', width: '420px', maxWidth: '100%' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>Alterar valor planejado</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{editando.item} · {editando.descricao}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '14px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Valor atual</span>
                            <span style={{ fontWeight: 700 }}>{fmt(editando.atual)}</span>
                        </div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Novo valor (R$)</label>
                        <input
                            value={novoValor}
                            autoFocus
                            onChange={e => setNovoValor(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmarEdicao(); if (e.key === 'Escape') setEditando(null) }}
                            placeholder="0,00"
                            style={{ width: '100%', textAlign: 'right', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', padding: '10px 12px', fontSize: '16px', fontWeight: 700, boxSizing: 'border-box' }}
                        />
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', margin: '18px 0 16px' }}>⚠️ Tem certeza da alteração?</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditando(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancelar</button>
                            <button onClick={confirmarEdicao} disabled={!!salvando} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px', opacity: salvando ? 0.6 : 1 }}>
                                {salvando ? 'Salvando…' : 'Confirmar alteração'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
