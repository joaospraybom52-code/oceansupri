'use client'

import { useEffect, useState } from 'react'
import { Printer, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { statusCusto, type DisplayRow, type TipoLinhaCusto } from '@/lib/utils/custo'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const pct1 = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`

// Mesmas cores da tela (padrão Excel do acompanhamento), em versão clara pro papel
const ESTILO: Record<TipoLinhaCusto, React.CSSProperties> = {
    raiz: { background: '#1F4E78', color: '#fff', fontWeight: 700 },
    subtotal: { background: '#9DC3E6', color: '#10243a', fontWeight: 600 },
    servico: { background: '#FFE699', color: '#5a4a00', fontWeight: 600 },
    insumo: { background: '#fff', color: '#333', fontWeight: 400 },
}
const NIVEL: Record<TipoLinhaCusto, number> = { raiz: 0, subtotal: 1, servico: 2, insumo: 3 }

interface Totais { planejado: number; custo: number; vinculado: number; saldo: number; comprometido: number }

export interface RelatorioObra {
    obraCodigo: string
    obraNome: string
    atualizado: string | null
    rows: DisplayRow[]
    totais: Totais
    balanco: { receita: number; despesa: number }
    evolucao: { vgv: number; medido: number; faturado: number }
}

export default function RelatorioCustoClient({ relatorios }: { relatorios: RelatorioObra[] }) {
    const [printing, setPrinting] = useState(false)
    useEffect(() => {
        if (!printing) return
        const t = setTimeout(() => { window.print(); setPrinting(false) }, 350)
        return () => clearTimeout(t)
    }, [printing])

    const geradoEm = new Date().toLocaleString('pt-BR')
    const varias = relatorios.length > 1

    return (
        <div>
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 10mm 9mm 14mm; }
                    body { background: #fff !important; }
                    body * { visibility: hidden !important; }
                    #custo-print, #custo-print * { visibility: visible !important; }
                    #custo-print { position: absolute; left: 0; top: 0; width: 750px; }
                    .no-print { display: none !important; }
                    .rep-sec { break-inside: avoid; page-break-inside: avoid; }
                    #custo-print thead { display: table-header-group; }
                    #custo-print tr { break-inside: avoid; page-break-inside: avoid; }
                    .print-footer { display: flex !important; visibility: visible !important;
                        position: fixed; bottom: 0; left: 0; right: 0; justify-content: space-between;
                        padding: 4px 8px; background: #fff; border-top: 1px solid #ccc; font-size: 8px; color: #555; }
                    .print-footer * { visibility: visible !important; }
                    /* cada obra começa numa página nova (menos a primeira) */
                    .folha-obra + .folha-obra { break-before: page; page-break-before: always; }
                }
            `}</style>

            {/* Barra de ações (não sai no PDF) */}
            <div className="glass-card no-print" style={{ padding: '14px 18px', marginBottom: '18px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link href="/obras-eng/acompanhamento-custo" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>
                    <ArrowLeft size={16} /> Voltar
                </Link>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {varias ? `${relatorios.length} obras` : `${relatorios[0]?.obraCodigo} — ${relatorios[0]?.obraNome}`}
                </span>
                <button onClick={() => setPrinting(true)} disabled={printing} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <Printer size={16} /> {printing ? 'Preparando…' : 'Exportar PDF'}
                </button>
            </div>

            <div id="custo-print">
                {relatorios.length === 0 && (
                    <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhuma das obras selecionadas tem dados de custo.
                    </div>
                )}
                {relatorios.map(r => <FolhaObra key={r.obraCodigo} r={r} geradoEm={geradoEm} />)}

                {/* Rodapé único (fixo em todas as páginas na impressão) */}
                <div className="print-footer" style={{ display: 'none' }}>
                    <span>
                        Constrowins · {varias
                            ? `${relatorios.length} obras`
                            : `${relatorios[0]?.obraCodigo} — ${relatorios[0]?.obraNome}`}
                    </span>
                    <span>Acompanhamento de Custo · {geradoEm}</span>
                </div>
            </div>
        </div>
    )
}

/** Uma folha completa do relatório (uma obra). */
function FolhaObra({ r, geradoEm }: { r: RelatorioObra; geradoEm: string }) {
    const { obraCodigo, obraNome, atualizado, rows, totais, balanco, evolucao } = r

    // ── Indicador principal: consumo do planejado
    const pctCusto = totais.planejado > 0 ? totais.custo / totais.planejado : 0
    const pctVinc = totais.planejado > 0 ? totais.vinculado / totais.planejado : 0
    const pctCompr = totais.planejado > 0 ? totais.comprometido / totais.planejado : 0
    const stGeral = statusCusto(totais.planejado, totais.saldo)

    // ── Balanço da obra
    const saldoBal = balanco.receita - balanco.despesa
    const balPositivo = saldoBal >= 0

    // ── Medição + faturamento
    const pctRealizada = evolucao.vgv ? evolucao.medido / evolucao.vgv : 0
    const pctTotal = evolucao.vgv ? (evolucao.medido + evolucao.faturado) / evolucao.vgv : 0
    const saldoFinal = evolucao.vgv - evolucao.medido - evolucao.faturado
    const clamp = (x: number) => Math.max(0, Math.min(1, x))

    const card: React.CSSProperties = {
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 18px',
    }
    const rotulo: React.CSSProperties = {
        fontSize: '10px', letterSpacing: '.04em', color: '#737373', textTransform: 'uppercase', fontWeight: 700,
    }
    const th: React.CSSProperties = {
        padding: '7px 9px', fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.4px', color: '#fff', background: '#2B2E34', textAlign: 'right', whiteSpace: 'nowrap',
    }
    const td: React.CSSProperties = { padding: '5px 9px', fontSize: '10px', textAlign: 'right', whiteSpace: 'nowrap' }

    return (
        <div className="folha-obra" style={{ background: '#fff', color: '#222', padding: '22px 24px', borderRadius: '10px', fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: '840px', margin: '0 auto 20px' }}>

                {/* Cabeçalho */}
                <div className="rep-sec" style={{ borderBottom: '3px solid #E63329', paddingBottom: '10px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
                        <div>
                            <div style={{ fontSize: '10px', letterSpacing: '.1em', color: '#E63329', fontWeight: 800 }}>CONSTROWINS · ENGENHARIA</div>
                            <h1 style={{ fontSize: '19px', fontWeight: 800, color: '#2B2E34', margin: '3px 0 0' }}>Relatório de Acompanhamento de Custo</h1>
                            <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>{obraCodigo} — {obraNome}</div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#777', lineHeight: 1.6 }}>
                            <div>Emitido em {geradoEm}</div>
                            <div>Origem: UAU{atualizado ? ` · dados de ${new Date(atualizado).toLocaleString('pt-BR')}` : ''}</div>
                            <div>Valores acumulados da obra</div>
                        </div>
                    </div>
                </div>

                {/* ── 1. Indicador de custo ── */}
                <div className="rep-sec" style={{ marginBottom: '18px' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 800, color: '#2B2E34', marginBottom: '9px' }}>1 · Custo da obra</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                        {[
                            { l: 'Planejado', v: totais.planejado, c: '#1F4E78', sub: 'orçamento da obra' },
                            { l: 'Custo', v: totais.custo, c: '#B45309', sub: pct1(pctCusto) + ' do planejado' },
                            { l: 'Vinculado', v: totais.vinculado, c: '#7C3AED', sub: pct1(pctVinc) + ' do planejado' },
                            { l: 'Saldo', v: totais.saldo, c: totais.saldo >= 0 ? '#047857' : '#B91C1C', sub: totais.saldo >= 0 ? 'disponível' : 'estourado' },
                        ].map(k => (
                            <div key={k.l} style={{ ...card, borderTop: `3px solid ${k.c}`, padding: '11px 12px' }}>
                                <div style={rotulo}>{k.l}</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: k.c, marginTop: '5px', whiteSpace: 'nowrap' }}>{brl(k.v)}</div>
                                <div style={{ fontSize: '9px', color: '#888', marginTop: '3px' }}>{k.sub}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ ...card, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#444' }}>Consumo do planejado (custo + vinculado)</span>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: pctCompr > 1 ? '#B91C1C' : '#1F4E78' }}>{pct1(pctCompr)}</span>
                        </div>
                        <div style={{ position: 'relative', height: '15px', background: '#E8EAED', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '15px', width: `${clamp(pctCompr) * 100}%`, background: '#C4B5FD' }} />
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '15px', width: `${clamp(pctCusto) * 100}%`, background: '#D97706' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '9.5px', color: '#666' }}>
                            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#D97706', borderRadius: 2, marginRight: 5 }} />Custo {brl(totais.custo)}</span>
                            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#C4B5FD', borderRadius: 2, marginRight: 5 }} />Vinculado {brl(totais.vinculado)}</span>
                            <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#444' }}>
                                Situação: <span style={{ background: stGeral.bg, color: stGeral.fg, padding: '1px 8px', borderRadius: '9999px' }}>{stGeral.txt || '—'}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── 2. Balanço + Medição ── */}
                <div className="rep-sec" style={{ marginBottom: '18px' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 800, color: '#2B2E34', marginBottom: '9px' }}>2 · Situação financeira da obra</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                        {/* Balanço da Obra */}
                        <div style={card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {balPositivo ? <CheckCircle2 size={20} color="#00C091" /> : <AlertCircle size={20} color="#D64550" />}
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#737373' }}>Balanço da Obra</span>
                            </div>
                            <div style={{ fontSize: '21px', fontWeight: 800, margin: '8px 0 12px', color: balPositivo ? '#00C091' : '#D64550' }}>{brl(saldoBal)}</div>
                            <div style={{ height: '1px', background: '#e0e0e0', marginBottom: '10px' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                <div>
                                    <div style={rotulo}>Entradas (medido)</div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '3px' }}>{brl(balanco.receita)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={rotulo}>Saídas (pago)</div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '3px' }}>{brl(balanco.despesa)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Medição + Faturamento */}
                        <div style={card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0072B2' }}>MEDIÇÃO + FATURAMENTO</span>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#008000', whiteSpace: 'nowrap' }}>VGV: {brl(evolucao.vgv)}</span>
                            </div>
                            <div style={{ fontSize: '21px', fontWeight: 800, color: '#262626', marginTop: '8px', lineHeight: 1 }}>
                                {(pctRealizada * 100).toFixed(2).replace('.', ',')}%
                            </div>
                            <div style={{ fontSize: '9px', color: '#737373', marginTop: '4px', letterSpacing: '.03em' }}>DO CONTRATO REALIZADO</div>
                            <div style={{ position: 'relative', height: '12px', background: '#E0E0E0', borderRadius: '6px', margin: '11px 0 12px', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', left: 0, top: 0, height: '12px', width: `${clamp(pctTotal) * 100}%`, background: '#A5D8FF' }} />
                                <div style={{ position: 'absolute', left: 0, top: 0, height: '12px', width: `${clamp(pctRealizada) * 100}%`, background: '#0072B2' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                <div>
                                    <div style={rotulo}>Realizado</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0072B2', marginTop: '3px' }}>{brl(evolucao.medido)}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={rotulo}>Faturado</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#00A2E8', marginTop: '3px' }}>{brl(evolucao.faturado)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={rotulo}>Saldo final</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#A6611A', marginTop: '3px' }}>{brl(saldoFinal)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 3. Tabela ── */}
                <div>
                    <h2 style={{ fontSize: '13px', fontWeight: 800, color: '#2B2E34', marginBottom: '9px' }}>3 · Acompanhamento por item</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d5d8dc' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, textAlign: 'left', width: '68px' }}>Item</th>
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
                                const st = statusCusto(r.planej, saldo)
                                return (
                                    <tr key={i} style={{ ...ESTILO[r.tipo], borderBottom: '1px solid #e3e6e9' }}>
                                        <td style={{ ...td, textAlign: 'left', fontWeight: r.tipo === 'insumo' ? 400 : 700 }}>{r.item}</td>
                                        <td style={{ ...td, textAlign: 'left', paddingLeft: `${9 + NIVEL[r.tipo] * 11}px`, whiteSpace: 'normal' }}>{r.descricao}</td>
                                        <td style={td}>{brl(r.planej)}</td>
                                        <td style={td}>{brl(r.aprov)}</td>
                                        <td style={td}>{brl(r.vinc)}</td>
                                        <td style={td}>{brl(saldo)}</td>
                                        <td style={{ ...td, textAlign: 'center' }}>
                                            {st.txt && <span style={{ background: st.bg, color: st.fg, padding: '1px 6px', borderRadius: '9999px', fontSize: '8.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>{st.txt}</span>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#2B2E34', color: '#fff', fontWeight: 800 }}>
                                <td style={{ ...td, textAlign: 'left' }} colSpan={2}>TOTAL DA OBRA</td>
                                <td style={td}>{brl(totais.planejado)}</td>
                                <td style={td}>{brl(totais.custo)}</td>
                                <td style={td}>{brl(totais.vinculado)}</td>
                                <td style={td}>{brl(totais.saldo)}</td>
                                <td style={{ ...td, textAlign: 'center' }}>{pct1(pctCompr)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

        </div>
    )
}
