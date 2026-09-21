'use client'

import { useMemo, useState, useEffect } from 'react'
import { BarChart3, Wallet, X, RotateCcw } from 'lucide-react'
import {
    CICLO_PADRAO, custoDiarioMedio, diasDoCiclo,
    type CicloNcg, type LinhaDre,
} from '@/lib/utils/dre-gerencial'

const CHAVE_CICLO = 'dre-ncg-ciclo'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)
const mesLabel = (ym: string) => {
    const [a, m] = ym.split('-')
    return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]}/${a.slice(2)}`
}

export default function DreGerencialClient({ meses, linhas }: { meses: string[]; linhas: LinhaDre[] }) {
    const anos = useMemo(() => Array.from(new Set(meses.map(m => m.slice(0, 4)))).sort().reverse(), [meses])
    const [ano, setAno] = useState(anos[0] ?? '')

    // Ciclo editável (simulação). Fica salvo no navegador de quem mexeu.
    const [ciclo, setCiclo] = useState<CicloNcg>(CICLO_PADRAO)
    const [showNcg, setShowNcg] = useState(false)
    useEffect(() => {
        try {
            const salvo = localStorage.getItem(CHAVE_CICLO)
            if (salvo) setCiclo({ ...CICLO_PADRAO, ...JSON.parse(salvo) })
        } catch { /* navegador sem storage: segue no padrão */ }
    }, [])
    const mudarCiclo = (campo: keyof CicloNcg, valor: number) => {
        const novo = { ...ciclo, [campo]: valor }
        setCiclo(novo)
        try { localStorage.setItem(CHAVE_CICLO, JSON.stringify(novo)) } catch { /* ignora */ }
    }

    const mesesAno = useMemo(() => meses.filter(m => m.startsWith(ano)), [meses, ano])
    const totalAno = (l: LinhaDre) => mesesAno.reduce((s, m) => s + (l.valores[m] ?? 0), 0)

    const base = useMemo(() => custoDiarioMedio(linhas, mesesAno), [linhas, mesesAno])
    const dias = diasDoCiclo(ciclo)
    const ncg = dias * base.custoDiario

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

    const campos: [keyof CicloNcg, string, string][] = [
        ['execucao', 'Dias para executar', 'Da mobilização até faturar a medição'],
        ['recebimento', 'Dias para receber', 'Da emissão da nota até o dinheiro entrar'],
        ['pagamento', 'Dias para pagar', 'Prazo do fornecedor — entra subtraindo'],
    ]

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

            {/* NCG — clique abre a explicação e a simulação do ciclo */}
            <div
                onClick={() => setShowNcg(true)}
                className="glass-card"
                style={{ marginTop: '20px', padding: '20px 24px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}
                title="Clique para entender o indicador e simular o ciclo"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Wallet size={22} color="#f59e0b" />
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>NCG — Necessidade de Capital de Giro</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Ciclo de {dias} dias × custo diário de {fmt(base.custoDiario)} · clique para simular
                        </div>
                    </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b' }}>R$ {fmt(ncg)}</div>
            </div>

            {showNcg && (
                <div
                    onClick={() => setShowNcg(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
                >
                    <div onClick={e => e.stopPropagation()} className="glass-card" style={{ padding: '24px', width: '580px', maxWidth: '100%', maxHeight: '86vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>NCG — Necessidade de Capital de Giro</h3>
                            <button onClick={() => setShowNcg(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 14px' }}>
                            É quanto de dinheiro a empresa precisa ter em caixa para bancar a operação enquanto o cliente
                            não paga. A obra é executada, a nota é emitida e o dinheiro só entra depois — mas fornecedor,
                            salário e imposto vencem antes disso. A conta é o <b>ciclo financeiro</b> (quantos dias o
                            dinheiro fica fora do caixa) multiplicado pelo <b>custo diário médio</b>.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                            {campos.map(([campo, rotulo, ajuda]) => (
                                <div key={campo}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>{rotulo}</label>
                                    <input
                                        type="number" min={0} max={999} value={ciclo[campo]}
                                        onChange={e => mudarCiclo(campo, Math.max(0, Number(e.target.value) || 0))}
                                        style={{ width: '100%', textAlign: 'right', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', padding: '8px 10px', fontSize: '15px', fontWeight: 700, boxSizing: 'border-box' }}
                                    />
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>{ajuda}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', lineHeight: 1.9 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Ciclo financeiro</span>
                                <span><b>{ciclo.execucao} + {ciclo.recebimento} − {ciclo.pagamento} = {dias} dias</b></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Custo diário médio ({base.dias} dias fechados de {ano})</span>
                                <span><b>{fmt(base.custoDiario)}</b></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', marginTop: '8px', paddingTop: '8px' }}>
                                <span style={{ fontWeight: 700 }}>NCG</span>
                                <span style={{ fontWeight: 800, fontSize: '17px', color: '#f59e0b' }}>R$ {fmt(ncg)}</span>
                            </div>
                        </div>

                        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '14px 0 0' }}>
                            O custo diário vem sozinho da DRE: custos variáveis + impostos + custo fixo dos meses
                            fechados, divididos pelos dias corridos. As despesas financeiras ficam de fora porque são o
                            custo de financiar o ciclo, não o que precisa ser financiado. Cada dia de ciclo vale{' '}
                            <b>{fmt(base.custoDiario)}</b> — negociar prazo com o fornecedor ou antecipar o recebimento
                            libera caixa nessa proporção.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => { setCiclo(CICLO_PADRAO); try { localStorage.removeItem(CHAVE_CICLO) } catch { /* ignora */ } }}
                                className="btn-secondary"
                                style={{ padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <RotateCcw size={14} /> Voltar ao padrão ({CICLO_PADRAO.execucao}/{CICLO_PADRAO.recebimento}/{CICLO_PADRAO.pagamento})
                            </button>
                            <button onClick={() => setShowNcg(false)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.6 }}>
                As linhas de dedução aparecem em vermelho e já entram subtraindo nos subtotais.
                Depreciação (7) e IRPJ/CSLL (11) estão zeradas por falta de informação, e as tarifas
                bancárias ainda não entram nas despesas financeiras (9).
            </p>
        </div>
    )
}
