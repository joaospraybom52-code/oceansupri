'use client'

import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import type { LinhaDre } from '@/lib/utils/dre-gerencial'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)
const mesLabel = (ym: string) => {
    const [a, m] = ym.split('-')
    return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]}/${a.slice(2)}`
}

export default function DreGerencialClient({ meses, linhas }: { meses: string[]; linhas: LinhaDre[] }) {
    const anos = useMemo(() => Array.from(new Set(meses.map(m => m.slice(0, 4)))).sort().reverse(), [meses])
    const [ano, setAno] = useState(anos[0] ?? '')

    const mesesAno = useMemo(() => meses.filter(m => m.startsWith(ano)), [meses, ano])
    const totalAno = (l: LinhaDre) => mesesAno.reduce((s, m) => s + (l.valores[m] ?? 0), 0)

    const th: React.CSSProperties = {
        padding: '10px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.5px', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap',
        position: 'sticky', top: 0, background: 'var(--bg-secondary)',
    }
    const td: React.CSSProperties = { padding: '9px 12px', fontSize: '13px', textAlign: 'right', whiteSpace: 'nowrap' }

    // Subtotal em azul, resultado final em verde/vermelho, linhas de conta neutras.
    const estilo = (l: LinhaDre): React.CSSProperties => {
        if (l.tipo === 'resultado') return { background: 'rgba(16,185,129,0.10)', fontWeight: 800 }
        if (l.tipo === 'subtotal') return { background: 'rgba(56,189,248,0.10)', fontWeight: 700 }
        return {}
    }
    const cor = (l: LinhaDre, v: number): string | undefined => {
        if (l.tipo === 'valor') return v ? '#f87171' : 'var(--text-muted)'      // são deduções
        return v >= 0 ? 'var(--accent-green, #10b981)' : '#ef4444'
    }

    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={22} color="#38bdf8" /> DRE Gerencial
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        Regime de caixa — o que entrou e saiu no mês (origem: UAU)
                    </p>
                </div>
                {anos.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {anos.map(a => (
                            <button
                                key={a}
                                onClick={() => setAno(a)}
                                className={a === ano ? 'btn-primary' : 'btn-secondary'}
                                style={{ padding: '8px 16px', fontSize: '13px' }}
                            >
                                {a}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${420 + mesesAno.length * 130}px` }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, textAlign: 'left', width: '36px' }}>Nº</th>
                                <th style={{ ...th, textAlign: 'left', minWidth: '320px' }}>Linha</th>
                                {mesesAno.map(m => <th key={m} style={{ ...th, width: '130px' }}>{mesLabel(m)}</th>)}
                                <th style={{ ...th, width: '150px', color: 'var(--text-secondary)' }}>Total {ano}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {linhas.map(l => {
                                const total = totalAno(l)
                                return (
                                    <tr key={l.n} style={{ ...estilo(l), borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ ...td, textAlign: 'left', color: 'var(--text-muted)' }}>{l.n}</td>
                                        <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal' }}>
                                            {l.rotulo}
                                            {l.detalhe && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>{l.detalhe}</div>
                                            )}
                                        </td>
                                        {mesesAno.map(m => {
                                            const v = l.valores[m] ?? 0
                                            return <td key={m} style={{ ...td, color: cor(l, v) }}>{fmt(v)}</td>
                                        })}
                                        <td style={{ ...td, fontWeight: 800, color: cor(l, total) }}>{fmt(total)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.6 }}>
                As linhas de dedução aparecem em vermelho e já entram subtraindo nos subtotais.
                Depreciação (7) e IRPJ/CSLL (11) estão zeradas por falta de informação, e as tarifas
                bancárias ainda não entram nas despesas financeiras (9).
            </p>
        </div>
    )
}
