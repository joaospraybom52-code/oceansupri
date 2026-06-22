'use client'

import { useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'

interface Linha {
    obra_plt: string
    obra: string | null
    item_plt: string | null
    serv_plt: string | null
    servico: string | null
    insumo: string | null
    unid_ins: string | null
    valor_planej: number | null
    valor_aprov: number | null
    saldo_vlr_vinc: number | null
    ordem: number | null
    atualizado_em: string | null
}

type Tipo = 'raiz' | 'subtotal' | 'servico' | 'insumo'
interface DisplayRow {
    tipo: Tipo
    item: string
    descricao: string
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

export default function AcompanhamentoCustoClient({ linhas }: { linhas: Linha[] }) {
    const obras = useMemo(() => {
        const m = new Map<string, string>()
        for (const l of linhas) if (!m.has(l.obra_plt)) m.set(l.obra_plt, l.obra || l.obra_plt)
        return Array.from(m.entries()).map(([codigo, nome]) => ({ codigo, nome }))
    }, [linhas])

    const [obraSel, setObraSel] = useState(obras[0]?.codigo ?? '')

    const { rows, atualizado } = useMemo(() => {
        const ls = linhas.filter(l => l.obra_plt === obraSel)
        // total por serviço (item_plt) entre os insumos
        const servTot: Record<string, { planej: number; aprov: number; vinc: number; nome: string }> = {}
        for (const l of ls) {
            if (String(l.serv_plt) !== '-1') {
                const k = l.item_plt || ''
                servTot[k] = servTot[k] || { planej: 0, aprov: 0, vinc: 0, nome: l.servico || '' }
                servTot[k].planej += Number(l.valor_planej || 0)
                servTot[k].aprov += Number(l.valor_aprov || 0)
                servTot[k].vinc += Number(l.saldo_vlr_vinc || 0)
            }
        }
        const out: DisplayRow[] = []
        let lastServ: string | null = null
        for (const l of ls) {
            const item = l.item_plt || ''
            if (String(l.serv_plt) === '-1') {
                out.push({ tipo: dots(item) === 0 ? 'raiz' : 'subtotal', item, descricao: l.servico || '', planej: Number(l.valor_planej || 0), aprov: Number(l.valor_aprov || 0), vinc: Number(l.saldo_vlr_vinc || 0) })
                lastServ = null
            } else {
                if (item !== lastServ) {
                    const t = servTot[item]
                    out.push({ tipo: 'servico', item, descricao: t?.nome || l.servico || '', planej: t?.planej || 0, aprov: t?.aprov || 0, vinc: t?.vinc || 0 })
                    lastServ = item
                }
                out.push({ tipo: 'insumo', item, descricao: l.insumo || '', planej: Number(l.valor_planej || 0), aprov: Number(l.valor_aprov || 0), vinc: Number(l.saldo_vlr_vinc || 0) })
            }
        }
        const at = ls[0]?.atualizado_em ?? null
        return { rows: out, atualizado: at }
    }, [linhas, obraSel])

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
                </div>
                <select value={obraSel} onChange={e => setObraSel(e.target.value)} className="select-field" style={{ minWidth: '260px' }}>
                    {obras.map(o => <option key={o.codigo} value={o.codigo}>{o.nome}</option>)}
                </select>
            </div>

            {rows.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum dado de custo para esta obra.
                </div>
            ) : (
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
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
                                    return (
                                        <tr key={i} style={{ ...base, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ ...td, textAlign: 'left', fontWeight: r.tipo === 'insumo' ? 400 : 700 }}>{r.item}</td>
                                            <td style={{ ...td, textAlign: 'left', paddingLeft: `${12 + NIVEL[r.tipo] * 16}px`, maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.descricao}</td>
                                            <td style={td}>{fmt(r.planej)}</td>
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
            )}
        </div>
    )
}
