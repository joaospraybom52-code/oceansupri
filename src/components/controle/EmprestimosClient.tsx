'use client'

import { useMemo, useState } from 'react'
import { Landmark, ChevronDown, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import MultiSelect from '@/components/ui/MultiSelect'
import MultiSearchSelect from '@/components/ui/MultiSearchSelect'
import {
    categoriaFinanceira, ROTULO_CATEGORIA, CORES_CATEGORIA, CATEGORIAS,
    type CategoriaFinanceira,
} from '@/lib/utils/insumos-financeiros'
import type { InsumoFinRow } from '@/app/controle/emprestimos/page'

const MESES = [
    { v: '01', n: 'Janeiro' }, { v: '02', n: 'Fevereiro' }, { v: '03', n: 'Março' },
    { v: '04', n: 'Abril' }, { v: '05', n: 'Maio' }, { v: '06', n: 'Junho' },
    { v: '07', n: 'Julho' }, { v: '08', n: 'Agosto' }, { v: '09', n: 'Setembro' },
    { v: '10', n: 'Outubro' }, { v: '11', n: 'Novembro' }, { v: '12', n: 'Dezembro' },
]
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const matchPeriodo = (d: string | null, anos: string[], meses: string[]) => {
    if (!d) return anos.length === 0 && meses.length === 0
    if (anos.length && !anos.includes(d.slice(0, 4))) return false
    if (meses.length && !meses.includes(d.slice(5, 7))) return false
    return true
}

const lbl: React.CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }
const td: React.CSSProperties = { padding: '9px 16px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)' }

export default function EmprestimosClient({ obras, linhas }: {
    obras: { codigo: string | null; nome: string }[]
    linhas: InsumoFinRow[]
}) {
    const [filtroObras, setFiltroObras] = useState<string[]>([])
    const [filtroAnos, setFiltroAnos] = useState<string[]>([])
    const [filtroMeses, setFiltroMeses] = useState<string[]>([])
    const [aberta, setAberta] = useState<CategoriaFinanceira | null>(null)

    // Só o que é financeiro — o resto é custo de obra e vive na KPI'S.
    const financeiras = useMemo(
        () => linhas.filter(r => categoriaFinanceira(r.descrinsumo) !== null), [linhas])

    const anoOptions = useMemo(() => {
        const s = new Set<string>()
        financeiras.forEach(r => { if (r.data_movimento) s.add(r.data_movimento.slice(0, 4)) })
        return Array.from(s).sort((a, b) => b.localeCompare(a))
    }, [financeiras])

    const obraOptions = useMemo(() => {
        const nome = new Map(obras.filter(o => o.codigo).map(o => [o.codigo as string, o.nome]))
        const cods = new Set<string>()
        financeiras.forEach(r => { if (r.obra) cods.add(r.obra) })
        return Array.from(cods).sort().map(c => ({ value: c, label: nome.has(c) ? `${c} - ${nome.get(c)}` : c }))
    }, [financeiras, obras])

    const filtradas = useMemo(() => financeiras.filter(r =>
        (filtroObras.length === 0 || filtroObras.includes(r.obra ?? ''))
        && matchPeriodo(r.data_movimento, filtroAnos, filtroMeses),
    ), [financeiras, filtroObras, filtroAnos, filtroMeses])

    /** Soma pago / a pagar de um conjunto de linhas. */
    const soma = (rows: InsumoFinRow[]) => rows.reduce((a, r) => ({
        pago: a.pago + Number(r.vlr_at_pago || 0),
        aPagar: a.aPagar + Number(r.vlr_at_pagar || 0),
    }), { pago: 0, aPagar: 0 })

    const porCategoria = useMemo(() => {
        const m = new Map<CategoriaFinanceira, InsumoFinRow[]>()
        CATEGORIAS.forEach(c => m.set(c, []))
        for (const r of filtradas) {
            const c = categoriaFinanceira(r.descrinsumo)
            if (c) m.get(c)!.push(r)
        }
        return m
    }, [filtradas])

    const total = soma(filtradas)

    // Detalhe por insumo dentro de uma categoria (o UAU tem 3 nomes p/ empréstimo)
    const detalhe = (cat: CategoriaFinanceira) => {
        const m = new Map<string, { insumo: string; pago: number; aPagar: number; n: number }>()
        for (const r of porCategoria.get(cat) ?? []) {
            const k = r.descrinsumo ?? '—'
            const cur = m.get(k) ?? { insumo: k, pago: 0, aPagar: 0, n: 0 }
            cur.pago += Number(r.vlr_at_pago || 0); cur.aPagar += Number(r.vlr_at_pagar || 0); cur.n++
            m.set(k, cur)
        }
        return Array.from(m.values()).sort((a, b) => b.pago - a.pago)
    }

    const porObra = useMemo(() => {
        const nome = new Map(obras.filter(o => o.codigo).map(o => [o.codigo as string, o.nome]))
        const m = new Map<string, { obra: string; label: string; pago: number; aPagar: number }>()
        for (const r of filtradas) {
            const k = r.obra ?? '—'
            const cur = m.get(k) ?? { obra: k, label: nome.has(k) ? `${k} - ${nome.get(k)}` : k, pago: 0, aPagar: 0 }
            cur.pago += Number(r.vlr_at_pago || 0); cur.aPagar += Number(r.vlr_at_pagar || 0)
            m.set(k, cur)
        }
        return Array.from(m.values()).sort((a, b) => b.pago - a.pago)
    }, [filtradas, obras])

    // Evolução mensal do PAGO, por categoria
    const evolucao = useMemo(() => {
        const meses = MESES_ABREV.map(m => {
            const base: Record<string, string | number> = { mes: m }
            CATEGORIAS.forEach(c => { base[ROTULO_CATEGORIA[c]] = 0 })
            return base
        })
        for (const r of filtradas) {
            if (!r.data_movimento) continue
            const i = Number(r.data_movimento.slice(5, 7)) - 1
            const c = categoriaFinanceira(r.descrinsumo)
            if (i < 0 || i > 11 || !c) continue
            meses[i][ROTULO_CATEGORIA[c]] = Number(meses[i][ROTULO_CATEGORIA[c]]) + Number(r.vlr_at_pago || 0)
        }
        return meses
    }, [filtradas])

    const limpar = () => { setFiltroObras([]); setFiltroAnos([]); setFiltroMeses([]) }
    const temFiltro = filtroObras.length > 0 || filtroAnos.length > 0 || filtroMeses.length > 0

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Landmark size={22} color="#6366f1" /> Empréstimos, Juros, Tarifas e Consórcio
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Movimento financeiro com bancos — fora das medidas de obra da KPI&apos;S, que agora contam só o que a obra recebe e paga.
                </p>
            </div>

            {/* Filtros — os mesmos da KPI'S */}
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', position: 'relative', zIndex: 30 }}>
                <div>
                    <label style={lbl}>Código da obra</label>
                    <MultiSearchSelect selected={filtroObras} onChange={setFiltroObras} options={obraOptions} placeholder="Todas as obras" minWidth={280} />
                </div>
                <div>
                    <label style={lbl}>Ano</label>
                    <MultiSelect selected={filtroAnos} onChange={setFiltroAnos} options={anoOptions.map(a => ({ value: a, label: a }))} placeholder="Todos os anos" minWidth={150} />
                </div>
                <div>
                    <label style={lbl}>Mês</label>
                    <MultiSelect selected={filtroMeses} onChange={setFiltroMeses} options={MESES.map(m => ({ value: m.v, label: m.n }))} placeholder="Todos os meses" minWidth={170} />
                </div>
                {temFiltro && <button onClick={limpar} className="btn-secondary">Limpar filtros</button>}
            </div>

            {/* Totais */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total pago</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{brl(total.pago)}</div>
                </div>
                <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total a pagar</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{brl(total.aPagar)}</div>
                </div>
                <div className="glass-card" style={{ padding: '18px 20px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pago + a pagar</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{brl(total.pago + total.aPagar)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{filtradas.length} lançamentos</div>
                </div>
            </div>

            {/* Por categoria, com drill por insumo */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Por categoria</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Clique para ver os insumos de cada uma — o UAU tem mais de um nome para empréstimo.
                    </p>
                </div>
                {CATEGORIAS.map(cat => {
                    const s = soma(porCategoria.get(cat) ?? [])
                    const n = (porCategoria.get(cat) ?? []).length
                    const itens = aberta === cat ? detalhe(cat) : []
                    return (
                        <div key={cat}>
                            <div
                                onClick={() => setAberta(aberta === cat ? null : cat)}
                                style={{
                                    display: 'grid', gridTemplateColumns: '26px 1fr auto auto', gap: '16px', alignItems: 'center',
                                    padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border-glass)',
                                }}
                            >
                                <span style={{ color: 'var(--text-muted)' }}>
                                    {aberta === cat ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: CORES_CATEGORIA[cat], flexShrink: 0 }} />
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{ROTULO_CATEGORIA[cat]}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n} lanç.</span>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: '150px' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pago</div>
                                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#ef4444' }}>{brl(s.pago)}</div>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: '150px' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>A pagar</div>
                                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#f59e0b' }}>{brl(s.aPagar)}</div>
                                </div>
                            </div>
                            {aberta === cat && (
                                <div style={{ background: 'rgba(0,0,0,0.18)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={th}>Insumo (nome no UAU)</th>
                                                <th style={{ ...th, textAlign: 'right', width: '90px' }}>Lanç.</th>
                                                <th style={{ ...th, textAlign: 'right', width: '170px' }}>Pago</th>
                                                <th style={{ ...th, textAlign: 'right', width: '170px' }}>A pagar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itens.length === 0 && (
                                                <tr><td style={{ ...td, color: 'var(--text-muted)' }} colSpan={4}>Nada no filtro.</td></tr>
                                            )}
                                            {itens.map(it => (
                                                <tr key={it.insumo}>
                                                    <td style={td}>{it.insumo}</td>
                                                    <td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)' }}>{it.n}</td>
                                                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{brl(it.pago)}</td>
                                                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>{brl(it.aPagar)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Evolução mensal */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>Evolução do pago no ano</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Some os anos no filtro acima para comparar; sem filtro de ano, os meses acumulam todos os anos.
                </p>
                <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                        <BarChart data={evolucao} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                            <Tooltip
                                formatter={(v: number | undefined) => brl(Number(v ?? 0))}
                                contentStyle={{ background: '#131328', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            {CATEGORIAS.map(c => (
                                <Bar key={c} dataKey={ROTULO_CATEGORIA[c]} stackId="a" fill={CORES_CATEGORIA[c]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Por obra */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Por obra</h3>
                </div>
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, position: 'sticky', top: 0, background: '#131328', zIndex: 2 }}>Obra</th>
                                <th style={{ ...th, textAlign: 'right', width: '180px', position: 'sticky', top: 0, background: '#131328', zIndex: 2 }}>Pago</th>
                                <th style={{ ...th, textAlign: 'right', width: '180px', position: 'sticky', top: 0, background: '#131328', zIndex: 2 }}>A pagar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {porObra.length === 0 && (
                                <tr><td style={{ ...td, color: 'var(--text-muted)' }} colSpan={3}>Nada no filtro.</td></tr>
                            )}
                            {porObra.map(o => (
                                <tr key={o.obra}>
                                    <td style={{ ...td, color: 'var(--accent-blue)', fontWeight: 600 }}>{o.label}</td>
                                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{brl(o.pago)}</td>
                                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>{brl(o.aPagar)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
