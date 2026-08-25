'use client'

import { useMemo, useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, Printer, Search } from 'lucide-react'

interface Conta { banco: number; conta: string; nomeBanco: string | null; saldoAnterior: number }
interface Mov {
    banco: number; conta: string; nomeBanco: string | null; data: string
    historico: string | null; lanct: string | null; cheque: string | null
    credito: number; debito: number; tipoLanc: number | null
    obra: string | null
}
/** Linha do Fluxo de Caixa: parcela a pagar (emitida em débito, StatusParc=1)
 *  ou a receber (mesma medida do painel "Próximas Medições"). */
interface APagar {
    tipo: 'pagar' | 'receber'
    obra: string | null; obraLabel: string | null
    numProc: number | null; numParc: number | null; totalParcelas: number | null
    banco: number | null; conta: string | null
    contraparte: string | null; obs: string | null
    data: string; valor: number
}

const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)
/** Negativo com sinal de menos (o Intl já põe o "-"), destacado em vermelho. */
const brlP = (v: number) => brl(v)
/** Estilo do valor negativo. `escuro` = linha de fundo escuro (totais). */
const corNeg = (v: number, escuro = false): React.CSSProperties | undefined =>
    v < 0 ? { color: escuro ? '#F87171' : '#DC2626', fontWeight: 700 } : undefined
const dmy = (iso: string) => iso ? iso.split('-').reverse().join('/') : ''
/** Arredonda só na exibição/total — o UAU soma os valores crus e arredonda no
 *  fim; arredondar lançamento a lançamento fecha 1 centavo acima. */
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

// TipoLanc da consulta de conciliação do UAU. Atenção: -1 é "cheque não
// compensado fora do período" (o worker já descarta), não pagamento.
const TIPO: Record<number, string> = {
    0: 'Cont. Financeiro',
    1: 'Transf. Cheque',
    2: 'Transferência',
    4: 'Recebido',
    5: 'Chq. Devolvido',
    11: 'Compensação',
    30: 'Cheque',
    31: 'Pago',
    32: 'Borderô',
    33: 'Chq. em aberto',
    44: 'Depósito comp.',
}
const tipoLabel = (t: number | null) => (t == null ? '—' : TIPO[t] ?? `Tipo ${t}`)

export default function FechamentoBancoClient({
    de, ate, padrao, dataBase, contas, movimentos, aPagar = [],
}: {
    de: string; ate: string; padrao: string; dataBase: string | null
    contas: Conta[]; movimentos: Mov[]; aPagar?: APagar[]
}) {
    const router = useRouter()
    const [fDe, setFDe] = useState(de)
    const [fAte, setFAte] = useState(ate)
    const [aba, setAba] = useState<'conciliacao' | 'posicao' | 'fluxo'>('conciliacao')
    const [printing, setPrinting] = useState(false)
    const [carregando, startTransition] = useTransition()

    useEffect(() => {
        if (!printing) return
        const t = setTimeout(() => { window.print(); setPrinting(false) }, 350)
        return () => clearTimeout(t)
    }, [printing])

    function gerar() {
        const fim = fAte < fDe ? fDe : fAte
        startTransition(() => router.push(`/controle/fechamento-banco?de=${fDe}&ate=${fim}`))
    }

    const nomeConta = useMemo(
        () => new Map(contas.map(c => [`${c.banco}|${c.conta}`, c.nomeBanco || `Banco ${c.banco}`])),
        [contas],
    )

    // ── Posição de Bancos: saldo anterior + crédito − débito no período
    const posicao = useMemo(() => {
        const m = new Map<string, { banco: number; conta: string; nomeBanco: string; ant: number; cred: number; deb: number }>()
        for (const c of contas) {
            m.set(`${c.banco}|${c.conta}`, {
                banco: c.banco, conta: c.conta, nomeBanco: c.nomeBanco || `Banco ${c.banco}`,
                ant: c.saldoAnterior, cred: 0, deb: 0,
            })
        }
        for (const v of movimentos) {
            const k = `${v.banco}|${v.conta}`
            const cur = m.get(k) ?? { banco: v.banco, conta: v.conta, nomeBanco: v.nomeBanco || `Banco ${v.banco}`, ant: 0, cred: 0, deb: 0 }
            cur.cred += v.credito
            cur.deb += v.debito
            m.set(k, cur)
        }
        const linhas = Array.from(m.values())
            .map(x => ({
                ...x, ant: r2(x.ant), cred: r2(x.cred), deb: r2(x.deb), atual: r2(x.ant + x.cred - x.deb),
            }))
            .sort((a, b) => a.banco - b.banco || a.conta.localeCompare(b.conta))
        const bruto = Array.from(m.values()).reduce((s, l) => ({
            ant: s.ant + l.ant, cred: s.cred + l.cred, deb: s.deb + l.deb,
        }), { ant: 0, cred: 0, deb: 0 })
        return {
            linhas,
            total: {
                ant: r2(bruto.ant), cred: r2(bruto.cred), deb: r2(bruto.deb),
                atual: r2(bruto.ant + bruto.cred - bruto.deb),
            },
        }
    }, [contas, movimentos])

    // ── Conciliação: saldo corrido único, partindo do saldo inicial somado
    const conciliacao = useMemo(() => {
        const inicial = contas.reduce((s, c) => s + c.saldoAnterior, 0)
        const ordenados = [...movimentos].sort((a, b) =>
            a.data.localeCompare(b.data) || a.banco - b.banco || a.conta.localeCompare(b.conta) || (a.lanct || '').localeCompare(b.lanct || ''))
        const linhas: (Mov & { despesa: number; receita: number; saldo: number })[] = []
        let acc = inicial
        for (const v of ordenados) {
            acc += v.credito - v.debito
            linhas.push({ ...v, despesa: r2(-v.debito), receita: r2(v.credito), saldo: r2(acc) })
        }
        return { inicial: r2(inicial), linhas, final: r2(acc) }
    }, [contas, movimentos])

    // ── Fluxo de Caixa: a receber e a pagar com vencimento no período
    const fluxo = useMemo(() => {
        const linhas = aPagar
            .filter(p => p.data && p.data >= de && p.data <= ate)
            .sort((a, b) => a.data.localeCompare(b.data)
                || a.tipo.localeCompare(b.tipo)
                || (a.obra || '').localeCompare(b.obra || '')
                || (a.numProc ?? 0) - (b.numProc ?? 0)
                || (a.numParc ?? 0) - (b.numParc ?? 0))
        const receber = linhas.filter(l => l.tipo === 'receber').reduce((s, l) => s + l.valor, 0)
        const pagar = linhas.filter(l => l.tipo === 'pagar').reduce((s, l) => s + l.valor, 0)
        return { linhas, receber: r2(receber), pagar: r2(pagar), total: r2(receber - pagar) }
    }, [aPagar, de, ate])

    const periodoLabel = fDe === fAte ? dmy(de) : `${dmy(de)} a ${dmy(ate)}`
    const geradoEm = new Date().toLocaleString('pt-BR')

    /* estilos */
    const th: React.CSSProperties = {
        padding: '7px 9px', fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.4px', color: '#fff', background: '#2B2E34', textAlign: 'right', whiteSpace: 'nowrap',
    }
    const td: React.CSSProperties = { padding: '5px 9px', fontSize: '10px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid #e6e8ea' }
    const abaBtn = (ativa: boolean): React.CSSProperties => ({
        padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        background: ativa ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${ativa ? '#10b981' : 'var(--border-glass)'}`,
        color: ativa ? '#10b981' : 'var(--text-secondary)',
    })

    return (
        <div>
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 8mm 8mm 12mm; }
                    body { background: #fff !important; }
                    body * { visibility: hidden !important; }
                    #banco-print, #banco-print * { visibility: visible !important; }
                    #banco-print { position: absolute; left: 0; top: 0; width: 1040px; }
                    .no-print { display: none !important; }
                    #banco-print thead { display: table-header-group; }
                    #banco-print tr { break-inside: avoid; page-break-inside: avoid; }
                    /* tfoot repete em toda quebra de página; como grupo de linha
                       normal ele sai uma vez só, no fim do relatório */
                    #banco-print tfoot.total-final { display: table-row-group; }
                }
            `}</style>

            <div className="no-print" style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Landmark size={22} color="#10b981" /> Fechamento Banco
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Conciliação bancária e posição das contas (origem: UAU)
                    {dataBase ? ` · espelho desde ${dmy(dataBase)}` : ''}
                </p>
            </div>

            {/* Filtros */}
            <div className="glass-card no-print" style={{ padding: '16px 20px', marginBottom: '18px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>De</label>
                    <input type="date" value={fDe} onChange={e => setFDe(e.target.value)} className="input-field" />
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Até</label>
                    <input type="date" value={fAte} onChange={e => setFAte(e.target.value)} className="input-field" />
                </div>
                <button onClick={gerar} disabled={carregando} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <Search size={16} /> {carregando ? 'Gerando…' : 'Gerar relatório'}
                </button>
                <button onClick={() => { setFDe(padrao); setFAte(padrao) }} className="btn-secondary" style={{ fontSize: '12px' }}>
                    Último dia com movimento
                </button>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setAba('conciliacao')} style={abaBtn(aba === 'conciliacao')}>Conciliação Bancária</button>
                    <button onClick={() => setAba('posicao')} style={abaBtn(aba === 'posicao')}>Posição de Bancos</button>
                    <button onClick={() => setAba('fluxo')} style={abaBtn(aba === 'fluxo')}>Fluxo de Caixa</button>
                </div>
                <button onClick={() => setPrinting(true)} disabled={printing} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <Printer size={16} /> {printing ? 'Preparando…' : 'Exportar PDF'}
                </button>
            </div>

            {/* ── Folha ── */}
            <div id="banco-print" style={{ background: '#fff', color: '#222', padding: '20px 22px', borderRadius: '10px', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                <div style={{ borderBottom: '2px solid #2B2E34', paddingBottom: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#2B2E34' }}>CONSTROWINS SERVIÇOS DE ENGENHARIA LTDA</div>
                        <h2 style={{ fontSize: '17px', fontWeight: 800, margin: '3px 0 0' }}>
                            {aba === 'conciliacao' ? 'Conciliação Bancária' : aba === 'posicao' ? 'Posição de Bancos' : 'Fluxo de Caixa'}
                        </h2>
                        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Período: {periodoLabel}</div>
                        {aba === 'conciliacao' && (
                            <div style={{ fontSize: '11px', color: '#555' }}>
                                Saldo real inicial: <strong style={corNeg(conciliacao.inicial)}>{brlP(conciliacao.inicial)}</strong> · Moeda: R$ REAL
                            </div>
                        )}
                        {aba === 'fluxo' && (
                            <div style={{ fontSize: '11px', color: '#555' }}>
                                A receber: <strong style={{ color: '#047857' }}>{brl(fluxo.receber)}</strong> ·
                                {' '}A pagar: <strong style={{ color: '#B91C1C' }}>{brl(fluxo.pagar)}</strong> ·
                                {' '}Saldo previsto: <strong style={corNeg(fluxo.total) ?? { color: '#047857' }}>{brlP(fluxo.total)}</strong>
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#777', lineHeight: 1.6 }}>
                        <div>Emitido em {geradoEm}</div>
                        <div>Origem: UAU · {aba === 'fluxo' ? `${fluxo.linhas.length} parcelas` : `${contas.length} contas`}</div>
                    </div>
                </div>

                {/* Detalhamento do saldo inicial: como cada conta entrou no período */}
                {aba === 'conciliacao' && (
                    <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#2B2E34', marginBottom: '5px' }}>
                            Detalhamento de saldo inicial:
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d5d8dc' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...th, textAlign: 'left' }}>Banco</th>
                                    <th style={{ ...th, textAlign: 'left', width: '260px' }}>Conta</th>
                                    <th style={{ ...th, width: '150px' }}>Saldo inicial</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contas.map(c => (
                                    <tr key={`${c.banco}|${c.conta}`}>
                                        <td style={{ ...td, textAlign: 'left' }}>{c.banco} - {c.nomeBanco || `BANCO ${c.banco}`}</td>
                                        <td style={{ ...td, textAlign: 'left' }}>{c.conta}</td>
                                        <td style={{ ...td, ...corNeg(c.saldoAnterior) }}>{brlP(c.saldoAnterior)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#eef0f2', fontWeight: 800 }}>
                                    <td style={{ ...td, textAlign: 'right' }} colSpan={2}>Total:</td>
                                    <td style={{ ...td, ...corNeg(conciliacao.inicial) }}>{brlP(conciliacao.inicial)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {aba === 'conciliacao' ? (
                    conciliacao.linhas.length === 0 ? (
                        <div style={{ padding: '26px', textAlign: 'center', color: '#777', fontSize: '13px' }}>
                            Nenhum lançamento no período.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d5d8dc' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...th, textAlign: 'left', width: '74px' }}>Data</th>
                                    <th style={{ ...th, textAlign: 'left', width: '104px' }}>Tipo</th>
                                    <th style={{ ...th, textAlign: 'left', width: '74px' }}>Doc.</th>
                                    <th style={{ ...th, textAlign: 'left', width: '150px' }}>Conta</th>
                                    <th style={{ ...th, textAlign: 'left' }}>Histórico</th>
                                    <th style={{ ...th, textAlign: 'left', width: '180px' }}>Obra</th>
                                    <th style={{ ...th, width: '104px' }}>Vlr. despesa</th>
                                    <th style={{ ...th, width: '104px' }}>Vlr. receita</th>
                                    <th style={{ ...th, width: '116px' }}>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {conciliacao.linhas.map((l, i) => (
                                    <tr key={i}>
                                        <td style={{ ...td, textAlign: 'left' }}>{dmy(l.data)}</td>
                                        <td style={{ ...td, textAlign: 'left' }}>{tipoLabel(l.tipoLanc)}</td>
                                        <td style={{ ...td, textAlign: 'left' }}>{l.lanct || l.cheque || '—'}</td>
                                        <td style={{ ...td, textAlign: 'left' }}>{l.banco} / {l.conta}</td>
                                        <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal' }}>{l.historico || '—'}</td>
                                        <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal', color: l.obra ? undefined : '#999' }}>{l.obra || '—'}</td>
                                        <td style={{ ...td, ...corNeg(l.despesa) }}>{l.despesa < 0 ? brlP(l.despesa) : '0,00'}</td>
                                        <td style={{ ...td, color: l.receita > 0 ? '#047857' : undefined }}>{brl(l.receita)}</td>
                                        <td style={{ ...td, fontWeight: 700, ...corNeg(l.saldo) }}>{brlP(l.saldo)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="total-final">
                                <tr style={{ background: '#2B2E34', color: '#fff', fontWeight: 800 }}>
                                    <td style={{ ...td, textAlign: 'left' }} colSpan={6}>
                                        TOTAL DO PERÍODO ({conciliacao.linhas.length} lançamentos)
                                    </td>
                                    <td style={{ ...td, ...corNeg(-posicao.total.deb, true) }}>{brlP(-posicao.total.deb)}</td>
                                    <td style={td}>{brl(posicao.total.cred)}</td>
                                    <td style={{ ...td, ...corNeg(conciliacao.final, true) }}>{brlP(conciliacao.final)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )
                ) : aba === 'posicao' ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d5d8dc' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, textAlign: 'left' }}>Banco</th>
                                <th style={{ ...th, textAlign: 'left', width: '150px' }}>Conta</th>
                                <th style={{ ...th, width: '140px' }}>Saldo Anterior</th>
                                <th style={{ ...th, width: '130px' }}>Crédito</th>
                                <th style={{ ...th, width: '130px' }}>Débito</th>
                                <th style={{ ...th, width: '150px' }}>Saldo Atual</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posicao.linhas.map((l, i) => (
                                <tr key={i}>
                                    <td style={{ ...td, textAlign: 'left' }}>{l.banco} - {nomeConta.get(`${l.banco}|${l.conta}`) || l.nomeBanco}</td>
                                    <td style={{ ...td, textAlign: 'left' }}>{l.conta}</td>
                                    <td style={{ ...td, ...corNeg(l.ant) }}>{brlP(l.ant)}</td>
                                    <td style={{ ...td, color: l.cred ? '#047857' : undefined }}>{brl(l.cred)}</td>
                                    <td style={{ ...td, color: l.deb ? '#B91C1C' : undefined }}>{brl(l.deb)}</td>
                                    <td style={{ ...td, fontWeight: 700, ...corNeg(l.atual) }}>{brlP(l.atual)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#2B2E34', color: '#fff', fontWeight: 800 }}>
                                <td style={{ ...td, textAlign: 'left' }} colSpan={2}>TOTAL</td>
                                <td style={{ ...td, ...corNeg(posicao.total.ant, true) }}>{brlP(posicao.total.ant)}</td>
                                <td style={td}>{brl(posicao.total.cred)}</td>
                                <td style={td}>{brl(posicao.total.deb)}</td>
                                <td style={{ ...td, ...corNeg(posicao.total.atual, true) }}>{brlP(posicao.total.atual)}</td>
                            </tr>
                        </tfoot>
                    </table>
                ) : (
                    fluxo.linhas.length === 0 ? (
                        <div style={{ padding: '26px', textAlign: 'center', color: '#777', fontSize: '13px' }}>
                            Nenhuma parcela a receber ou a pagar com vencimento no período.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d5d8dc' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...th, textAlign: 'left', width: '74px' }}>Data</th>
                                    <th style={{ ...th, textAlign: 'left', width: '68px' }}>Tipo</th>
                                    <th style={{ ...th, textAlign: 'left', width: '180px' }}>Obra</th>
                                    <th style={{ ...th, textAlign: 'left', width: '58px' }}>Proc.</th>
                                    <th style={{ ...th, textAlign: 'left', width: '48px' }}>Parc.</th>
                                    <th style={{ ...th, textAlign: 'left', width: '134px' }}>Conta</th>
                                    <th style={{ ...th, textAlign: 'left' }}>Fornecedor / Cliente</th>
                                    <th style={{ ...th, textAlign: 'left' }}>Observações</th>
                                    <th style={{ ...th, width: '116px' }}>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fluxo.linhas.map((l, i) => {
                                    const rec = l.tipo === 'receber'
                                    return (
                                        <tr key={i} style={rec ? { background: '#f2fbf6' } : undefined}>
                                            <td style={{ ...td, textAlign: 'left' }}>{dmy(l.data)}</td>
                                            <td style={{ ...td, textAlign: 'left' }}>
                                                <span style={{
                                                    display: 'inline-block', padding: '1px 7px', borderRadius: '9px', fontSize: '9px', fontWeight: 800,
                                                    background: rec ? '#dcfce7' : '#fee2e2', color: rec ? '#047857' : '#B91C1C',
                                                }}>{rec ? 'RECEBER' : 'PAGAR'}</span>
                                            </td>
                                            <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal', color: l.obraLabel ? undefined : '#999' }}>{l.obraLabel || '—'}</td>
                                            <td style={{ ...td, textAlign: 'left' }}>{l.numProc ?? '—'}</td>
                                            <td style={{ ...td, textAlign: 'left' }}>
                                                {l.numParc == null ? '—' : l.totalParcelas ? `${l.numParc}/${l.totalParcelas}` : l.numParc}
                                            </td>
                                            <td style={{ ...td, textAlign: 'left' }}>{l.banco != null ? `${l.banco} / ${l.conta || '—'}` : '—'}</td>
                                            <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal' }}>{l.contraparte || '—'}</td>
                                            <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal', color: l.obs ? undefined : '#999' }}>{l.obs || '—'}</td>
                                            <td style={{ ...td, fontWeight: 700, color: rec ? '#047857' : '#B91C1C' }}>{rec ? brl(l.valor) : brl(-l.valor)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot className="total-final">
                                <tr style={{ background: '#eef0f2', fontWeight: 700 }}>
                                    <td style={{ ...td, textAlign: 'right' }} colSpan={8}>Total a receber:</td>
                                    <td style={{ ...td, color: '#047857' }}>{brl(fluxo.receber)}</td>
                                </tr>
                                <tr style={{ background: '#eef0f2', fontWeight: 700 }}>
                                    <td style={{ ...td, textAlign: 'right' }} colSpan={8}>Total a pagar:</td>
                                    <td style={{ ...td, color: '#B91C1C' }}>{brl(-fluxo.pagar)}</td>
                                </tr>
                                <tr style={{ background: '#2B2E34', color: '#fff', fontWeight: 800 }}>
                                    <td style={{ ...td, textAlign: 'left' }} colSpan={8}>
                                        SALDO PREVISTO DO PERÍODO ({fluxo.linhas.length} lançamentos)
                                    </td>
                                    <td style={{ ...td, ...corNeg(fluxo.total, true) }}>{brlP(fluxo.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )
                )}
            </div>
        </div>
    )
}
