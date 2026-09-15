'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Printer, ArrowLeft } from 'lucide-react'
import type { DisplayRow, TipoLinhaCusto } from '@/lib/utils/custo'
import type { GrupoCliente } from '@/lib/utils/diretoria'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

// Mesmas cores da tela, em versão de papel (insumo com fundo branco).
const ESTILO: Record<TipoLinhaCusto, React.CSSProperties> = {
    raiz: { background: '#1F4E78', color: '#fff', fontWeight: 700 },
    subtotal: { background: '#9DC3E6', color: '#10243a', fontWeight: 600 },
    servico: { background: '#FFE699', color: '#5a4a00', fontWeight: 600 },
    insumo: { background: '#fff', color: '#333', fontWeight: 400 },
}
const NIVEL: Record<TipoLinhaCusto, number> = { raiz: 0, subtotal: 1, servico: 2, insumo: 3 }

interface Resumo {
    lista: GrupoCliente[]
    total: { custo: number; recebido: number; aReceber: number; saldo: number }
}

export default function RelatorioDiretoriaClient({
    obraCodigo, obraNome, atualizado, rows, resumo,
}: {
    obraCodigo: string
    obraNome: string
    atualizado: string | null
    rows: DisplayRow[]
    resumo: Resumo
}) {
    const [printing, setPrinting] = useState(false)
    useEffect(() => {
        if (!printing) return
        const t = setTimeout(() => { window.print(); setPrinting(false) }, 350)
        return () => clearTimeout(t)
    }, [printing])

    const geradoEm = new Date().toLocaleString('pt-BR')
    const corSaldo = (v: number) => (v >= 0 ? '#047857' : '#B91C1C')

    const th: React.CSSProperties = {
        padding: '6px 8px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.4px', color: '#fff', background: '#2B2E34', textAlign: 'right', whiteSpace: 'nowrap',
    }
    const td: React.CSSProperties = { padding: '5px 8px', fontSize: '10px', textAlign: 'right', whiteSpace: 'nowrap' }

    return (
        <div>
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 10mm 9mm 14mm; }
                    body { background: #fff !important; }
                    body * { visibility: hidden !important; }
                    #diretoria-print, #diretoria-print * { visibility: visible !important; }
                    #diretoria-print { position: absolute; left: 0; top: 0; width: 750px; }
                    .no-print { display: none !important; }
                    #diretoria-print thead { display: table-header-group; }
                    #diretoria-print tr { break-inside: avoid; page-break-inside: avoid; }
                    .rep-sec { break-inside: avoid; page-break-inside: avoid; }
                    .quebra { break-before: page; page-break-before: always; }
                    .print-footer { display: flex !important; visibility: visible !important;
                        position: fixed; bottom: 0; left: 0; right: 0; justify-content: space-between;
                        padding: 4px 8px; background: #fff; border-top: 1px solid #ccc; font-size: 8px; color: #555; }
                    .print-footer * { visibility: visible !important; }
                }
            `}</style>

            {/* Barra de ações (não sai no PDF) */}
            <div className="glass-card no-print" style={{ padding: '14px 18px', marginBottom: '18px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link href="/obras-eng/obras-diretoria" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>
                    <ArrowLeft size={16} /> Voltar
                </Link>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{obraNome}</span>
                <button onClick={() => setPrinting(true)} disabled={printing} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <Printer size={16} /> {printing ? 'Preparando…' : 'Exportar PDF'}
                </button>
            </div>

            <div id="diretoria-print" style={{ background: '#fff', color: '#222', padding: '20px 22px', borderRadius: '10px', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                {/* Cabeçalho */}
                <div style={{ borderBottom: '2px solid #2B2E34', paddingBottom: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#2B2E34' }}>CONSTROWINS SERVIÇOS DE ENGENHARIA LTDA</div>
                        <h2 style={{ fontSize: '17px', fontWeight: 800, margin: '3px 0 0' }}>Obras diretoria — {obraNome}</h2>
                        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                            Custo por item e resultado por cliente · origem: UAU
                            {atualizado ? ` · dados de ${new Date(atualizado).toLocaleString('pt-BR')}` : ''}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#777', lineHeight: 1.6 }}>
                        <div>Emitido em {geradoEm}</div>
                        <div>Documento interno da diretoria</div>
                    </div>
                </div>

                {/* Cards */}
                <div className="rep-sec" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    {[
                        { lab: 'Custo total', val: brl(resumo.total.custo), cor: '#B91C1C' },
                        { lab: 'Recebido', val: brl(resumo.total.recebido), cor: '#047857' },
                        { lab: 'A receber', val: brl(resumo.total.aReceber), cor: '#555' },
                        { lab: 'Saldo (recebido − custo)', val: brl(resumo.total.saldo), cor: corSaldo(resumo.total.saldo) },
                    ].map(c => (
                        <div key={c.lab} style={{ flex: 1, border: '1px solid #dcdfe4', borderRadius: '4px', padding: '9px 11px' }}>
                            <div style={{ fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '.6px', color: '#6b7280' }}>{c.lab}</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '3px', color: c.cor }}>{c.val}</div>
                        </div>
                    ))}
                </div>

                {/* Resultado por cliente */}
                <div className="rep-sec" style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#2B2E34', marginBottom: '5px' }}>Resultado por cliente</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d5d8dc' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, textAlign: 'left' }}>Cliente / Item</th>
                                <th style={{ ...th, textAlign: 'left', width: '78px' }}>Itens</th>
                                <th style={{ ...th, width: '92px' }}>Custo</th>
                                <th style={{ ...th, width: '92px' }}>Recebido</th>
                                <th style={{ ...th, width: '92px' }}>A receber</th>
                                <th style={{ ...th, width: '96px' }}>Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resumo.lista.map(g => (
                                <tr key={g.chave} style={{ borderBottom: '1px solid #e6e8ea' }}>
                                    <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal', fontWeight: 600 }}>{g.nome}</td>
                                    <td style={{ ...td, textAlign: 'left', color: '#6b7280' }}>{g.itens.join(', ') || '—'}</td>
                                    <td style={td}>{brl(g.custo)}</td>
                                    <td style={td}>{brl(g.recebido)}</td>
                                    <td style={{ ...td, color: '#6b7280' }}>{brl(g.aReceber)}</td>
                                    <td style={{ ...td, fontWeight: 700, color: corSaldo(g.saldo) }}>{brl(g.saldo)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#2B2E34', color: '#fff' }}>
                                <td style={{ ...td, textAlign: 'left', fontWeight: 800 }} colSpan={2}>TOTAL</td>
                                <td style={{ ...td, fontWeight: 800 }}>{brl(resumo.total.custo)}</td>
                                <td style={{ ...td, fontWeight: 800 }}>{brl(resumo.total.recebido)}</td>
                                <td style={{ ...td, fontWeight: 800 }}>{brl(resumo.total.aReceber)}</td>
                                <td style={{ ...td, fontWeight: 800, color: resumo.total.saldo >= 0 ? '#6EE7B7' : '#F87171' }}>{brl(resumo.total.saldo)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Estrutura de custo */}
                <div className="quebra">
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#2B2E34', marginBottom: '5px' }}>Custo por item</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d5d8dc' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, textAlign: 'left', width: '70px' }}>Item</th>
                                <th style={{ ...th, textAlign: 'left' }}>Descrição</th>
                                <th style={{ ...th, width: '104px' }}>Custo</th>
                                <th style={{ ...th, width: '104px' }}>Vinculado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={`${r.item}-${r.tipo}-${i}`} style={{ ...ESTILO[r.tipo], borderBottom: '1px solid #e6e8ea' }}>
                                    <td style={{ ...td, textAlign: 'left', paddingLeft: `${8 + NIVEL[r.tipo] * 12}px` }}>{r.item}</td>
                                    <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal' }}>{r.descricao}</td>
                                    <td style={td}>{brl(r.aprov)}</td>
                                    <td style={td}>{brl(r.vinc)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#eef0f2', fontWeight: 800 }}>
                                <td style={{ ...td, textAlign: 'left' }} colSpan={2}>TOTAL DA OBRA</td>
                                <td style={td}>{brl(resumo.total.custo)}</td>
                                <td style={td}>{brl(rows.filter(r => r.tipo === 'raiz').reduce((s, r) => s + r.vinc, 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Rodapé fixo na impressão */}
                <div className="print-footer" style={{ display: 'none' }}>
                    <span>Constrowins · {obraCodigo} — {obraNome}</span>
                    <span>Obras diretoria · {geradoEm}</span>
                </div>
            </div>
        </div>
    )
}
