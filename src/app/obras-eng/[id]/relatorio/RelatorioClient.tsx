'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Printer, Save, ImagePlus, X } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { calcularTendencia, terminoTendencia, SemanaCurva } from '@/lib/utils/curva-s'

const DIAS = [['seg', 'Seg'], ['ter', 'Ter'], ['qua', 'Qua'], ['qui', 'Qui'], ['sex', 'Sex'], ['sab', 'Sáb'], ['dom', 'Dom']] as const
const PERIODOS = [['manha', 'Manhã'], ['tarde', 'Tarde'], ['noite', 'Noite']] as const
const MOTIVOS = [
    'Falta de material', 'Falta de efetivo', 'Erro de execução / Retrabalho', 'Indefinição / Modificação de Projeto',
    'Parada de equipamento / falha de manutenção', 'Atraso / Falta de liberação de PTS', 'Interferência entre equipes ou atividades',
    'Falta de equipamento', 'Área não liberada', 'Problemas no planejamento - Produtividade', 'Falhas na segurança',
    'Condições Climáticas', 'Solicitação de modificações de serviços', 'Realocação de equipe p/ outra atividade', 'Mobilização de equipamento', 'Outros',
]

const fmt = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtCurto = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''
const toNum = (v: any): number | null => v == null || v === '' ? null : Number(String(v).replace(',', '.'))
const pct = (v: number | null | undefined) => v == null ? '-' : `${Number(v).toFixed(1)}%`

export default function RelatorioClient({ obra, programacoes, tarefas, restricoes, analises, curva, histograma, relatorios, podeEditar }: any) {
    const supabase = createClient()

    // Lista de semanas (união programações + curva)
    const semanas = useMemo(() => {
        const map = new Map<string, { ref: string, fim?: string }>()
        programacoes.forEach((p: any) => map.set(p.semana_referente_inicio, { ref: p.semana_referente_inicio, fim: p.semana_referente_fim }))
        curva.forEach((c: any) => { if (!map.has(c.semana_ref)) map.set(c.semana_ref, { ref: c.semana_ref }) })
        return Array.from(map.values()).sort((a, b) => a.ref.localeCompare(b.ref))
    }, [programacoes, curva])

    const [semanaSel, setSemanaSel] = useState<string>(semanas.length ? semanas[semanas.length - 1].ref : '')

    // Dados editáveis do relatório da semana
    const [ocorrencias, setOcorrencias] = useState('')
    const [pluvio, setPluvio] = useState<any>({})
    const [desvios, setDesvios] = useState<Record<string, string>>({})
    const [observacoes, setObservacoes] = useState('')
    const [fotos, setFotos] = useState<{ url: string, name: string }[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const r = relatorios.find((x: any) => x.semana_ref === semanaSel)
        setOcorrencias(((r?.ocorrencias as string[]) || []).join('\n'))
        setPluvio(r?.pluviometrico || {})
        const dv: Record<string, string> = {}
        ;((r?.desvios as any[]) || []).forEach(d => { dv[d.motivo] = String(d.qtd) })
        setDesvios(dv)
        setObservacoes(r?.observacoes || '')
    }, [semanaSel, relatorios])

    const semanaObj = semanas.find(s => s.ref === semanaSel)

    // Curva S + tendência
    const comTendencia = useMemo(() => {
        const base: SemanaCurva[] = curva.map((c: any) => ({ semana_ref: c.semana_ref, lb1_pct: toNum(c.lb1_pct), lb2_pct: toNum(c.lb2_pct), real_pct: toNum(c.real_pct) }))
        return calcularTendencia(base)
    }, [curva])
    const curvaSel = comTendencia.find(s => s.semana_ref === semanaSel)

    const previsto = curvaSel?.lb1_pct ?? null
    const real = curvaSel?.real_pct ?? null
    const desvio = (real != null && previsto != null) ? real - previsto : null
    const noPrazo = desvio != null ? desvio >= 0 : null

    // Datas da Linha de Base e da tendência
    const baseWeeks = comTendencia.filter(s => s.lb1_pct != null)
    const inicioBase = baseWeeks[0]?.semana_ref || ''
    const fimBase = (baseWeeks.find(s => (s.lb1_pct as number) >= 100)?.semana_ref) || baseWeeks[baseWeeks.length - 1]?.semana_ref || ''
    const inicioTend = obra?.data_inicio || comTendencia[0]?.semana_ref || ''
    const fimTend = terminoTendencia(comTendencia) || comTendencia[comTendencia.length - 1]?.semana_ref || ''

    const hoje = new Date()
    const diasPercorridos = obra?.data_inicio ? Math.max(0, Math.floor((hoje.getTime() - new Date(obra.data_inicio).getTime()) / 86400000)) : null
    const termino = obra?.previsao_termino || obra?.data_fim
    const diasTermino = termino ? Math.floor((new Date(termino).getTime() - hoje.getTime()) / 86400000) : null

    // PPC por semana
    const ppcPorSemana = useMemo(() => {
        return programacoes.map((p: any) => {
            const ts = tarefas.filter((t: any) => t.programacao_id === p.id)
            const concl = ts.filter((t: any) => t.status === 'concluida').length
            const ppc = ts.length > 0 ? (concl / ts.length) * 100 : 0
            return { label: fmtCurto(p.semana_referente_inicio), PPC: Number(ppc.toFixed(1)), ref: p.semana_referente_inicio }
        })
    }, [programacoes, tarefas])
    const ppcGeral = ppcPorSemana.length ? ppcPorSemana.reduce((a: number, b: any) => a + b.PPC, 0) / ppcPorSemana.length : 0

    // Restrições / IRR / 5W2H da semana selecionada
    const progSel = programacoes.find((p: any) => p.semana_referente_inicio === semanaSel)
    const restSemana = restricoes.filter((r: any) => progSel && r.programacao_id === progSel.id)
    const restRemovidas = restSemana.filter((r: any) => r.status === 'removida').length
    const irr = restSemana.length ? (restRemovidas / restSemana.length) * 100 : 0
    const restIds = new Set(restSemana.map((r: any) => r.id))
    const tarSemanaIds = new Set(tarefas.filter((t: any) => progSel && t.programacao_id === progSel.id).map((t: any) => t.id))
    const analisesSemana = analises.filter((a: any) => restIds.has(a.restricao_id) || tarSemanaIds.has(a.tarefa_id))

    // Curva chart data
    const curvaChart = comTendencia.map(s => ({ label: fmtCurto(s.semana_ref), 'Linha de Base': s.lb1_pct, 'Tendência': s.tendencia_pct, 'Real': s.real_pct }))

    // Histograma chart helpers
    const histOrd = [...histograma].sort((a, b) => a.semana_ref.localeCompare(b.semana_ref))
    const histData = (p: string, r: string) => histOrd.map(h => ({ label: fmtCurto(h.semana_ref), Previsto: toNum(h[p]), Realizado: toNum(h[r]) }))

    function onFotos(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || [])
        setFotos([...fotos, ...files.map(f => ({ url: URL.createObjectURL(f), name: f.name }))])
        e.target.value = ''
    }
    const removeFoto = (i: number) => setFotos(fotos.filter((_, idx) => idx !== i))

    async function salvar() {
        if (!semanaSel) { toast.error('Selecione uma semana.'); return }
        setSaving(true)
        const payload = {
            obra_id: obra.id,
            semana_ref: semanaSel,
            ocorrencias: ocorrencias.split('\n').map(s => s.trim()).filter(Boolean),
            pluviometrico: pluvio,
            desvios: MOTIVOS.filter(m => toNum(desvios[m])).map(m => ({ motivo: m, qtd: toNum(desvios[m]) })),
            observacoes: observacoes || null,
        }
        const { error } = await supabase.from('relatorio_semanal' as any).upsert(payload, { onConflict: 'obra_id,semana_ref' })
        if (error) toast.error('Erro ao salvar: ' + error.message)
        else toast.success('Dados da semana salvos!')
        setSaving(false)
    }

    const totalDia = (dia: string) => PERIODOS.reduce((a, [k]) => a + (Number(pluvio?.[dia]?.[k]) || 0), 0)

    // estilos do "papel"
    const card: React.CSSProperties = { background: '#fff', color: '#1a1a1a', borderRadius: '4px', padding: '24px', marginBottom: '16px', border: '1px solid #e2e2e2' }
    const h2: React.CSSProperties = { fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f3a66', borderBottom: '2px solid #0f3a66', paddingBottom: '6px', marginBottom: '14px' }
    const kpiBox: React.CSSProperties = { border: '1px solid #d0d0d0', borderRadius: '4px', padding: '10px 12px', textAlign: 'center' }
    const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '12px' }
    const tdc: React.CSSProperties = { border: '1px solid #d0d0d0', padding: '5px 8px', textAlign: 'center' }

    return (
        <div>
            <style>{`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { background: #fff !important; }
                    body * { visibility: hidden !important; }
                    #relatorio-print, #relatorio-print * { visibility: visible !important; }
                    #relatorio-print { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    .rep-sec { break-inside: avoid; page-break-inside: avoid; }
                    .rep-break { page-break-before: always; }
                }
            `}</style>

            {/* Barra de ferramentas */}
            <div className="glass-card no-print" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Semana do relatório</label>
                    <select value={semanaSel} onChange={e => setSemanaSel(e.target.value)} className="select-field">
                        {semanas.length === 0 && <option value="">Nenhuma semana</option>}
                        {semanas.map(s => <option key={s.ref} value={s.ref}>{fmt(s.ref)}{s.fim ? ` a ${fmt(s.fim)}` : ''}</option>)}
                    </select>
                </div>
                <div style={{ flex: 1 }} />
                <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <ImagePlus size={16} /> Anexar fotos
                    <input type="file" accept="image/*" multiple onChange={onFotos} style={{ display: 'none' }} />
                </label>
                <button onClick={() => window.print()} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Printer size={16} /> Exportar PDF
                </button>
            </div>

            {/* Editor dos dados da semana */}
            {podeEditar && (
                <div className="glass-card no-print" style={{ padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Editar dados da semana</h3>
                        <button onClick={salvar} className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Principais ocorrências (uma por linha)</label>
                        <textarea value={ocorrencias} onChange={e => setOcorrencias(e.target.value)} className="input-field" rows={3} style={{ width: '100%', resize: 'vertical' }} placeholder="Ex: Chuva no período da tarde" />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Monitoramento pluviométrico (mm)</label>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead><tr><th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)' }}>Período</th>{DIAS.map(([k, l]) => <th key={k} style={{ padding: '4px', color: 'var(--text-muted)' }}>{l}</th>)}</tr></thead>
                                <tbody>
                                    {PERIODOS.map(([pk, pl]) => (
                                        <tr key={pk}>
                                            <td style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}>{pl}</td>
                                            {DIAS.map(([dk]) => (
                                                <td key={dk} style={{ padding: '2px' }}>
                                                    <input type="text" inputMode="decimal" value={pluvio?.[dk]?.[pk] ?? ''} onChange={e => setPluvio({ ...pluvio, [dk]: { ...(pluvio?.[dk] || {}), [pk]: e.target.value } })} className="input-field" style={{ padding: '5px', width: '54px', textAlign: 'center' }} placeholder="0" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Análise dos desvios (quantidade por motivo)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px' }}>
                            {MOTIVOS.map(m => (
                                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="text" inputMode="numeric" value={desvios[m] ?? ''} onChange={e => setDesvios({ ...desvios, [m]: e.target.value })} className="input-field" style={{ padding: '5px', width: '48px', textAlign: 'center' }} placeholder="0" />
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{m}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ========== RELATÓRIO (papel branco / impressão) ========== */}
            <div id="relatorio-print">
                {/* Capa / cabeçalho */}
                <div className="rep-sec" style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1px', color: '#0f3a66' }}>CONSTROWINS</div>
                            <div style={{ fontSize: '11px', letterSpacing: '3px', color: '#888' }}>ENGENHARIA</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: 800 }}>RELATÓRIO SEMANAL</div>
                            <div style={{ fontSize: '13px', color: '#444' }}>{semanaObj ? `${fmt(semanaObj.ref)}${semanaObj.fim ? ` a ${fmt(semanaObj.fim)}` : ''}` : '-'}</div>
                        </div>
                    </div>
                    <div style={{ background: '#0f3a66', color: '#fff', padding: '8px 14px', borderRadius: '4px', fontWeight: 700, marginBottom: '16px' }}>
                        {obra?.nome} {obra?.local ? `— ${obra.local}` : ''} {obra?.codigo_uau ? `· ${obra.codigo_uau}` : ''}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        <div style={kpiBox}><div style={{ fontSize: '11px', color: '#777' }}>% Previsto</div><div style={{ fontSize: '20px', fontWeight: 800 }}>{pct(previsto)}</div></div>
                        <div style={kpiBox}><div style={{ fontSize: '11px', color: '#777' }}>% Real</div><div style={{ fontSize: '20px', fontWeight: 800 }}>{pct(real)}</div></div>
                        <div style={kpiBox}><div style={{ fontSize: '11px', color: '#777' }}>% Desvio</div><div style={{ fontSize: '20px', fontWeight: 800, color: desvio != null ? (desvio >= 0 ? '#15803d' : '#b91c1c') : '#1a1a1a' }}>{desvio == null ? '-' : `${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)}%`}</div></div>
                        <div style={kpiBox}><div style={{ fontSize: '11px', color: '#777' }}>Status</div><div style={{ fontSize: '16px', fontWeight: 800, color: noPrazo == null ? '#1a1a1a' : (noPrazo ? '#15803d' : '#b91c1c') }}>{noPrazo == null ? '-' : (noPrazo ? 'No prazo' : 'Atrasado')}</div></div>
                        <div style={kpiBox}><div style={{ fontSize: '11px', color: '#777' }}>Dias percorridos</div><div style={{ fontSize: '18px', fontWeight: 800 }}>{diasPercorridos ?? '-'}</div></div>
                        <div style={kpiBox}><div style={{ fontSize: '11px', color: '#777' }}>Dias p/ término</div><div style={{ fontSize: '18px', fontWeight: 800 }}>{diasTermino ?? '-'}</div></div>
                        <div style={kpiBox}><div style={{ fontSize: '11px', color: '#777' }}>Início / Término Base</div><div style={{ fontSize: '12px', fontWeight: 700 }}>{fmt(inicioBase)} → {fmt(fimBase)}</div></div>
                        <div style={kpiBox}><div style={{ fontSize: '11px', color: '#777' }}>Início / Término Tendência</div><div style={{ fontSize: '12px', fontWeight: 700 }}>{fmt(inicioTend)} → {fmt(fimTend)}</div></div>
                    </div>
                </div>

                {/* Ocorrências + Pluviométrico */}
                <div className="rep-sec" style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px' }}>
                    <div>
                        <div style={h2}>Principais ocorrências</div>
                        {ocorrencias.split('\n').filter(Boolean).length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem ocorrências registradas.</div> : (
                            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.8 }}>
                                {ocorrencias.split('\n').filter(Boolean).map((o, i) => <li key={i}>{o}</li>)}
                            </ol>
                        )}
                    </div>
                    <div>
                        <div style={h2}>Monitoramento pluviométrico (mm)</div>
                        <table style={tbl}>
                            <thead><tr><th style={{ ...tdc, background: '#f3f4f6' }}>Período</th>{DIAS.map(([k, l]) => <th key={k} style={{ ...tdc, background: '#f3f4f6' }}>{l}</th>)}</tr></thead>
                            <tbody>
                                {PERIODOS.map(([pk, pl]) => (
                                    <tr key={pk}><td style={{ ...tdc, textAlign: 'left', fontWeight: 600 }}>{pl}</td>{DIAS.map(([dk]) => <td key={dk} style={tdc}>{pluvio?.[dk]?.[pk] ? `${pluvio[dk][pk]}` : '0'}</td>)}</tr>
                                ))}
                                <tr><td style={{ ...tdc, textAlign: 'left', fontWeight: 700, background: '#f3f4f6' }}>Total</td>{DIAS.map(([dk]) => <td key={dk} style={{ ...tdc, fontWeight: 700, background: '#f3f4f6' }}>{totalDia(dk).toFixed(1)}</td>)}</tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PPC + Curva S */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>PPC Geral — média {ppcGeral.toFixed(0)}%</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={ppcPorSemana} margin={{ top: 16, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#555' }} />
                            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#555' }} />
                            <Tooltip formatter={(v: any) => `${v}%`} />
                            <Bar dataKey="PPC" radius={[3, 3, 0, 0]}>
                                {ppcPorSemana.map((e: any, i: number) => <Cell key={i} fill={e.PPC >= 80 ? '#15803d' : e.PPC >= 50 ? '#f59e0b' : '#b91c1c'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rep-sec" style={card}>
                    <div style={h2}>Curva S</div>
                    {curvaChart.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Cadastre a Linha de Base.</div> : (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={curvaChart} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#555' }} />
                                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#555' }} />
                                <Tooltip formatter={(v: any) => v == null ? '-' : `${Number(v).toFixed(1)}%`} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Line type="monotone" dataKey="Linha de Base" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="Tendência" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls />
                                <Line type="monotone" dataKey="Real" stroke="#ef4444" strokeWidth={3} dot={{ r: 2 }} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Histogramas */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>Histogramas (previsto × realizado)</div>
                    {histOrd.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem dados de histograma.</div> : (
                        [['MOI', 'moi_prev', 'moi_real'], ['MOD', 'mod_prev', 'mod_real'], ['Equipamentos', 'equip_prev', 'equip_real']].map(([titulo, p, r]) => (
                            <div key={titulo} style={{ marginBottom: '18px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{titulo}</div>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={histData(p, r)} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#555' }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#555' }} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar dataKey="Previsto" fill="#3b82f6" />
                                        <Bar dataKey="Realizado" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ))
                    )}
                </div>

                {/* Análise dos desvios */}
                <div className="rep-sec" style={card}>
                    <div style={h2}>Análise dos desvios</div>
                    {MOTIVOS.filter(m => toNum(desvios[m])).length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem desvios registrados.</div> : (
                        <table style={tbl}>
                            <thead><tr><th style={{ ...tdc, textAlign: 'left', background: '#f3f4f6' }}>Motivo</th><th style={{ ...tdc, background: '#f3f4f6', width: '120px' }}>Ocorrências</th></tr></thead>
                            <tbody>{MOTIVOS.filter(m => toNum(desvios[m])).map(m => <tr key={m}><td style={{ ...tdc, textAlign: 'left' }}>{m}</td><td style={tdc}>{toNum(desvios[m])}</td></tr>)}</tbody>
                        </table>
                    )}
                </div>

                {/* Restrições + IRR */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>Restrições — IRR {irr.toFixed(0)}% ({restRemovidas}/{restSemana.length})</div>
                    {restSemana.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem restrições nesta semana.</div> : (
                        <table style={tbl}>
                            <thead><tr><th style={{ ...tdc, textAlign: 'left', background: '#f3f4f6' }}>Descrição</th><th style={{ ...tdc, background: '#f3f4f6' }}>Categoria</th><th style={{ ...tdc, background: '#f3f4f6' }}>Responsável</th><th style={{ ...tdc, background: '#f3f4f6' }}>Status</th></tr></thead>
                            <tbody>{restSemana.map((r: any) => <tr key={r.id}><td style={{ ...tdc, textAlign: 'left' }}>{r.descricao}</td><td style={tdc}>{r.categoria || '-'}</td><td style={tdc}>{r.responsavel || '-'}</td><td style={{ ...tdc, color: r.status === 'removida' ? '#15803d' : '#b91c1c', fontWeight: 600 }}>{r.status === 'removida' ? 'Removida' : 'Pendente'}</td></tr>)}</tbody>
                        </table>
                    )}
                </div>

                {/* 5W2H */}
                <div className="rep-sec" style={card}>
                    <div style={h2}>Planos de ação (5W2H)</div>
                    {analisesSemana.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem planos de ação nesta semana.</div> : (
                        <table style={tbl}>
                            <thead><tr>{['O quê', 'Por quê', 'Onde', 'Quando', 'Quem', 'Como', 'Status'].map(h => <th key={h} style={{ ...tdc, background: '#f3f4f6' }}>{h}</th>)}</tr></thead>
                            <tbody>{analisesSemana.map((a: any) => <tr key={a.id}><td style={{ ...tdc, textAlign: 'left' }}>{a.what_o_que || '-'}</td><td style={{ ...tdc, textAlign: 'left' }}>{a.why_por_que || '-'}</td><td style={tdc}>{a.where_onde || '-'}</td><td style={tdc}>{a.when_quando ? fmt(a.when_quando) : '-'}</td><td style={tdc}>{a.who_quem || '-'}</td><td style={{ ...tdc, textAlign: 'left' }}>{a.how_como || '-'}</td><td style={tdc}>{a.status === 'concluido' ? 'Concluído' : 'Em andamento'}</td></tr>)}</tbody>
                        </table>
                    )}
                </div>

                {/* Imagens */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>Imagens da semana</div>
                    {fotos.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }} className="no-print">Use “Anexar fotos” acima para incluir imagens (não são salvas).</div> : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {fotos.map((f, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <img src={f.url} alt={f.name} style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                                    <button onClick={() => removeFoto(i)} className="no-print" title="Remover" style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
