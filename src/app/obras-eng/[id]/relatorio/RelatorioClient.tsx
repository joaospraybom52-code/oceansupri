'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Printer, Save, ImagePlus, X } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { calcularTendencia, projetarConclusao, SemanaCurva } from '@/lib/utils/curva-s'

const DIAS = [['seg', 'Seg'], ['ter', 'Ter'], ['qua', 'Qua'], ['qui', 'Qui'], ['sex', 'Sex'], ['sab', 'Sáb'], ['dom', 'Dom']] as const
const PERIODOS = [['manha', 'Manhã'], ['tarde', 'Tarde'], ['noite', 'Noite']] as const
const CATEGORIAS: Record<string, string> = {
    projeto: 'Projeto', material: 'Material', mao_de_obra: 'Mão de Obra', equipamento: 'Equipamento',
    area_frente: 'Área/Frente', contratacao: 'Contratação', clima: 'Clima', seguranca: 'Segurança', outros: 'Outros',
}
const MOTIVO_LABEL: Record<string, string> = {
    material: 'Falta de Material', mao_de_obra: 'Falta de Mão de Obra', projeto: 'Problema de Projeto',
    equipamento: 'Falha em Equipamento', area_frente: 'Área/Frente Indisponível', clima: 'Condições Climáticas',
    planejamento: 'Erro de Planejamento', terceiros: 'Atraso de Terceiros', outros: 'Outros',
}

const fmt = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const fmtCurto = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''
const toNum = (v: any): number | null => v == null || v === '' ? null : Number(String(v).replace(',', '.'))
const pct = (v: number | null | undefined) => v == null ? '-' : `${Number(v).toFixed(0)}%`

function diasDaSemana(ref: string) {
    let monday: Date | null = null
    if (ref) { const d = new Date(ref + 'T00:00:00'); const dow = d.getDay(); const off = dow === 0 ? -6 : 1 - dow; monday = new Date(d); monday.setDate(d.getDate() + off) }
    return DIAS.map(([k, l], i) => {
        let data = ''
        if (monday) { const dt = new Date(monday); dt.setDate(monday.getDate() + i); data = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
        return { key: k, label: l, data }
    })
}
const somaDias = (t: any, pref: 'qtd_' | 'qtd_real_') => DIAS.reduce((a, [k]) => a + (Number(t[`${pref}${k}`]) || 0), 0)

// Paleta da marca Constrowins
const BRAND_DARK = '#2B2E34'
const BRAND_RED = '#E63329'

// Marca Constrowins (aprox. do "C" de arcos + letreiro)
function LogoConstrowins({ height = 40 }: { height?: number }) {
    const radii = [10, 17, 24, 31, 38]
    const sw = 4.4
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg viewBox="0 0 100 100" width={height} height={height} style={{ flexShrink: 0 }}>
                {radii.map(r => {
                    const c = 2 * Math.PI * r
                    const g = c * 95 / 360   // metade do vão (vão total ~190° abrindo à direita)
                    const d = c - g * 2
                    return <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={BRAND_RED} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`0 ${g} ${d} ${g}`} />
                })}
            </svg>
            <div style={{ lineHeight: 1 }}>
                <div style={{ fontSize: `${height * 0.62}px`, fontWeight: 900, color: BRAND_DARK, letterSpacing: '0.5px' }}>CONSTROWINS</div>
                <div style={{ fontSize: `${height * 0.22}px`, fontWeight: 600, color: BRAND_DARK, letterSpacing: `${height * 0.13}px`, marginTop: '3px' }}>ENGENHARIA</div>
            </div>
        </div>
    )
}

export default function RelatorioClient({ obra, programacoes, tarefas, restricoes, analises, curva, histograma, relatorios, podeEditar }: any) {
    const supabase = createClient()

    const semanas = useMemo(() => {
        const map = new Map<string, { ref: string, fim?: string }>()
        programacoes.forEach((p: any) => map.set(p.semana_referente_inicio, { ref: p.semana_referente_inicio, fim: p.semana_referente_fim }))
        curva.forEach((c: any) => { if (!map.has(c.semana_ref)) map.set(c.semana_ref, { ref: c.semana_ref }) })
        return Array.from(map.values()).sort((a, b) => a.ref.localeCompare(b.ref))
    }, [programacoes, curva])

    const [semanaSel, setSemanaSel] = useState<string>(semanas.length ? semanas[semanas.length - 1].ref : '')
    const [ocorrencias, setOcorrencias] = useState('')
    const [pluvio, setPluvio] = useState<any>({})
    const [observacoes, setObservacoes] = useState('')
    const [eng, setEng] = useState('')
    const [fiscal, setFiscal] = useState('')
    const [fotos, setFotos] = useState<{ url: string, name: string }[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const r = relatorios.find((x: any) => x.semana_ref === semanaSel)
        setOcorrencias(((r?.ocorrencias as string[]) || []).join('\n'))
        setPluvio(r?.pluviometrico || {})
        setObservacoes(r?.observacoes || '')
    }, [semanaSel, relatorios])

    const semanaObj = semanas.find(s => s.ref === semanaSel)
    const semanaIdx = semanas.findIndex(s => s.ref === semanaSel)
    const semanaLabel = semanaIdx >= 0 ? `S${String(semanaIdx + 1).padStart(2, '0')}` : '-'

    // Curva S + tendência
    const comTendencia = useMemo(() => {
        const base: SemanaCurva[] = curva.map((c: any) => ({ semana_ref: c.semana_ref, lb1_pct: toNum(c.lb1_pct), lb2_pct: null, real_pct: toNum(c.real_pct) }))
        return calcularTendencia(base)
    }, [curva])
    const curvaSel = comTendencia.find(s => s.semana_ref === semanaSel)
    const previsto = curvaSel?.lb1_pct ?? null
    const real = curvaSel?.real_pct ?? null
    const desvio = (real != null && previsto != null) ? previsto - real : null
    const noPrazo = (real != null && previsto != null) ? real >= previsto : null

    const baseWeeks = comTendencia.filter(s => s.lb1_pct != null)
    const inicioLB = baseWeeks[0]?.semana_ref || comTendencia[0]?.semana_ref || ''
    const fimLB = comTendencia[comTendencia.length - 1]?.semana_ref || ''
    const inicioTend = inicioLB
    const projecao = useMemo(() => projetarConclusao(comTendencia), [comTendencia])
    const fimTend = projecao.dataTermino || comTendencia[comTendencia.length - 1]?.semana_ref || ''

    const hoje = new Date()
    const diasPercorridos = obra?.data_inicio ? Math.max(0, Math.floor((hoje.getTime() - new Date(obra.data_inicio).getTime()) / 86400000)) : null
    const termino = obra?.previsao_termino || obra?.data_fim
    const diasTermino = termino ? Math.floor((new Date(termino).getTime() - hoje.getTime()) / 86400000) : null

    // PPC por semana
    const ppcPorSemana = useMemo(() => programacoes.map((p: any) => {
        const ts = tarefas.filter((t: any) => t.programacao_id === p.id)
        const concl = ts.filter((t: any) => t.status === 'concluida').length
        return { label: fmtCurto(p.semana_referente_inicio), PPC: Number(ts.length > 0 ? ((concl / ts.length) * 100).toFixed(1) : 0) }
    }), [programacoes, tarefas])
    const ppcGeral = ppcPorSemana.length ? ppcPorSemana.reduce((a: number, b: any) => a + b.PPC, 0) / ppcPorSemana.length : 0

    // Análise dos desvios via restrições da semana
    const progSel = programacoes.find((p: any) => p.semana_referente_inicio === semanaSel)
    const restSemana = restricoes.filter((r: any) => progSel && r.programacao_id === progSel.id)
    const desviosPorCategoria = useMemo(() => {
        const m: Record<string, number> = {}
        restSemana.forEach((r: any) => { const c = r.categoria || 'outros'; m[c] = (m[c] || 0) + 1 })
        return Object.entries(m).sort((a, b) => b[1] - a[1])
    }, [restSemana])

    // IRR e 5W2H da semana
    const restRemovidas = restSemana.filter((r: any) => r.status === 'removida').length
    const irr = restSemana.length ? (restRemovidas / restSemana.length) * 100 : 0
    const restIds = new Set(restSemana.map((r: any) => r.id))
    const tarSemanaIds = new Set(tarefas.filter((t: any) => progSel && t.programacao_id === progSel.id).map((t: any) => t.id))
    const analisesSemana = (analises || []).filter((a: any) => restIds.has(a.restricao_id) || tarSemanaIds.has(a.tarefa_id))

    const curvaChart = projecao.pontos.map(s => ({ label: fmtCurto(s.semana_ref), 'Linha de Base': s.lb1_pct, 'Tendência': s.tendencia_pct, 'Real': s.real_pct }))
    const histOrd = [...histograma].sort((a, b) => a.semana_ref.localeCompare(b.semana_ref))
    const histData = (p: string, r: string) => histOrd.map(h => ({ label: fmtCurto(h.semana_ref), Previsto: toNum(h[p]), Realizado: toNum(h[r]) }))

    // Próxima semana (primeira programação com início > semanaSel)
    const proxProg = programacoes.filter((p: any) => p.semana_referente_inicio > semanaSel).sort((a: any, b: any) => a.semana_referente_inicio.localeCompare(b.semana_referente_inicio))[0]

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
            obra_id: obra.id, semana_ref: semanaSel,
            ocorrencias: ocorrencias.split('\n').map(s => s.trim()).filter(Boolean),
            pluviometrico: pluvio, observacoes: observacoes || null,
        }
        const { error } = await supabase.from('relatorio_semanal' as any).upsert(payload, { onConflict: 'obra_id,semana_ref' })
        if (error) toast.error('Erro ao salvar: ' + error.message); else toast.success('Dados da semana salvos!')
        setSaving(false)
    }

    const totalDia = (dia: string) => PERIODOS.reduce((a, [k]) => a + (Number(pluvio?.[dia]?.[k]) || 0), 0)

    // estilos do "papel"
    const card: React.CSSProperties = { background: '#fff', color: '#1a1a1a', borderRadius: '4px', padding: '24px', marginBottom: '16px', border: '1px solid #e2e2e2' }
    const h2: React.CSSProperties = { fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: BRAND_DARK, borderBottom: `2px solid ${BRAND_RED}`, paddingBottom: '6px', marginBottom: '14px' }
    const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '11px' }
    const tc: React.CSSProperties = { border: '1px solid #cfcfcf', padding: '4px 6px', textAlign: 'center' }
    const lbl: React.CSSProperties = { border: '1px solid #cfcfcf', padding: '6px 8px', fontWeight: 700, background: '#f3f4f6', fontSize: '12px' }
    const val: React.CSSProperties = { border: '1px solid #cfcfcf', padding: '6px 8px', textAlign: 'center', fontSize: '12px' }

    // ===== Matriz Previsto x Realizado de uma semana =====
    function MatrizSemana({ progRef }: { progRef: string }) {
        const prog = programacoes.find((p: any) => p.semana_referente_inicio === progRef)
        const ts = prog ? tarefas.filter((t: any) => t.programacao_id === prog.id) : []
        const dias = diasDaSemana(progRef)
        if (!prog) return <div style={{ fontSize: '12px', color: '#999' }}>Não há programação cadastrada para esta semana.</div>
        if (ts.length === 0) return <div style={{ fontSize: '12px', color: '#999' }}>Sem tarefas nesta semana.</div>
        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ ...tbl, minWidth: '760px' }}>
                    <thead>
                        <tr style={{ background: '#2B2E34', color: '#fff' }}>
                            <th style={{ ...tc, color: '#fff', borderColor: '#54585f' }}>Item</th>
                            <th style={{ ...tc, color: '#fff', borderColor: '#54585f' }}>Local</th>
                            <th style={{ ...tc, color: '#fff', borderColor: '#54585f', textAlign: 'left' }}>Atividade</th>
                            <th style={{ ...tc, color: '#fff', borderColor: '#54585f' }}>Un.</th>
                            <th style={{ ...tc, color: '#fff', borderColor: '#54585f' }}>Meta</th>
                            <th style={{ ...tc, color: '#fff', borderColor: '#54585f' }}>P / R</th>
                            {dias.map(d => <th key={d.key} style={{ ...tc, color: '#fff', borderColor: '#54585f', whiteSpace: 'nowrap' }}>{d.data || d.label}</th>)}
                            <th style={{ ...tc, color: '#fff', borderColor: '#54585f' }}>Total</th>
                            <th style={{ ...tc, color: '#fff', borderColor: '#54585f' }}>Status</th>
                            <th style={{ ...tc, color: '#fff', borderColor: '#54585f' }}>Motivo</th>
                        </tr>
                    </thead>
                    {ts.map((t: any, i: number) => {
                        const prevTot = somaDias(t, 'qtd_'); const realTot = somaDias(t, 'qtd_real_')
                        const ok = prevTot > 0 && realTot >= prevTot
                        const temReal = realTot > 0 || t.status === 'concluida'
                        return (
                            <tbody key={t.id} style={{ borderTop: '2px solid #cfcfcf' }}>
                                <tr>
                                    <td rowSpan={2} style={{ ...tc, fontWeight: 700 }}>{`T-${String(i + 1).padStart(2, '0')}`}</td>
                                    <td rowSpan={2} style={tc}>{obra?.local || '-'}</td>
                                    <td rowSpan={2} style={{ ...tc, textAlign: 'left', maxWidth: '200px', textTransform: 'capitalize' }}>{t.descricao}</td>
                                    <td rowSpan={2} style={tc}>{t.unidade || '-'}</td>
                                    <td rowSpan={2} style={{ ...tc, fontWeight: 600 }}>{t.qtd_total != null ? Number(t.qtd_total).toLocaleString('pt-BR') : '-'}</td>
                                    <td style={{ ...tc, fontWeight: 600, color: '#1d4ed8' }}>Prev.</td>
                                    {dias.map(d => <td key={d.key} style={tc}>{t[`qtd_${d.key}`] != null ? Number(t[`qtd_${d.key}`]).toLocaleString('pt-BR') : ''}</td>)}
                                    <td style={{ ...tc, fontWeight: 700, color: '#1d4ed8' }}>{prevTot ? prevTot.toLocaleString('pt-BR') : '-'}</td>
                                    <td rowSpan={2} style={{ ...tc, fontWeight: 700, background: !temReal ? '#fff' : (ok ? '#dcfce7' : '#fee2e2'), color: !temReal ? '#888' : (ok ? '#15803d' : '#b91c1c') }}>{!temReal ? '—' : (ok ? 'Ok' : 'Reprogramar')}</td>
                                    <td rowSpan={2} style={{ ...tc, textAlign: 'left' }}>{t.status === 'nao_concluida' && t.motivo_nao_conclusao ? (MOTIVO_LABEL[t.motivo_nao_conclusao] || t.motivo_nao_conclusao) : ''}</td>
                                </tr>
                                <tr>
                                    <td style={{ ...tc, fontWeight: 600, color: '#15803d' }}>Real.</td>
                                    {dias.map(d => <td key={d.key} style={tc}>{t[`qtd_real_${d.key}`] != null ? Number(t[`qtd_real_${d.key}`]).toLocaleString('pt-BR') : ''}</td>)}
                                    <td style={{ ...tc, fontWeight: 700, color: '#15803d' }}>{realTot ? realTot.toLocaleString('pt-BR') : '-'}</td>
                                </tr>
                            </tbody>
                        )
                    })}
                </table>
            </div>
        )
    }

    return (
        <div>
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 8mm; }
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
            <div className="glass-card no-print" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Semana do relatório</label>
                    <select value={semanaSel} onChange={e => setSemanaSel(e.target.value)} className="select-field">
                        {semanas.length === 0 && <option value="">Nenhuma semana</option>}
                        {semanas.map((s, i) => <option key={s.ref} value={s.ref}>S{String(i + 1).padStart(2, '0')} — {fmt(s.ref)}{s.fim ? ` a ${fmt(s.fim)}` : ''}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Engº residente</label>
                    <input type="text" value={eng} onChange={e => setEng(e.target.value)} className="input-field" placeholder="Nome" />
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Fiscal de obras</label>
                    <input type="text" value={fiscal} onChange={e => setFiscal(e.target.value)} className="input-field" placeholder="Nome" />
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

            {/* Editor dados da semana */}
            {podeEditar && (
                <div className="glass-card no-print" style={{ padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Editar dados da semana (ocorrências e chuva)</h3>
                        <button onClick={salvar} className="btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Principais ocorrências (uma por linha)</label>
                        <textarea value={ocorrencias} onChange={e => setOcorrencias(e.target.value)} className="input-field" rows={3} style={{ width: '100%', resize: 'vertical' }} placeholder="Ex: Chuva no período da tarde" />
                    </div>
                    <div>
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
                </div>
            )}

            {/* ========== RELATÓRIO ========== */}
            <div id="relatorio-print">
                {/* PARTE 1 — Cabeçalho */}
                <div className="rep-sec" style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#d6d6d6', padding: '14px 18px', borderRadius: '3px 3px 0 0', borderTop: `4px solid ${BRAND_RED}` }}>
                        <LogoConstrowins height={42} />
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: BRAND_DARK, letterSpacing: '1px' }}>RELATÓRIO SEMANAL</div>
                            <div style={{ fontSize: '12px', color: '#555' }}>{semanaObj ? `${fmt(semanaObj.ref)}${semanaObj.fim ? ` a ${fmt(semanaObj.fim)}` : ''}` : '-'} · {semanaLabel}</div>
                        </div>
                    </div>
                    <div style={{ background: BRAND_DARK, color: '#fff', textAlign: 'center', padding: '9px', fontSize: '15px', fontWeight: 800 }}>
                        RG. 089 — Relatório de Acompanhamento de Obra
                    </div>
                    <table style={{ ...tbl, fontSize: '12px' }}>
                        <tbody>
                            <tr>
                                <td style={lbl}>DATA</td><td style={val}>{hoje.toLocaleDateString('pt-BR')}</td>
                                <td style={lbl}>SEMANA</td><td style={val}>{semanaLabel}</td>
                                <td style={lbl}>DIAS PERCORRIDOS</td><td style={val}>{diasPercorridos != null ? `${diasPercorridos} dias` : '-'}</td>
                                <td style={lbl}>DIAS P/ TÉRMINO</td><td style={val}>{diasTermino != null ? `${diasTermino} dias` : '-'}</td>
                            </tr>
                            <tr>
                                <td style={lbl}>Cliente</td><td style={val}>{obra?.cliente || '-'}</td>
                                <td style={lbl}>% Previsto</td><td style={val}>{pct(previsto)}</td>
                                <td style={lbl}>Início LB</td><td style={val}>{fmt(inicioLB)}</td>
                                <td style={lbl}>Início tendência</td><td style={val}>{fmt(inicioTend)}</td>
                            </tr>
                            <tr>
                                <td style={lbl}>Projeto</td><td style={val}>{obra?.nome || '-'}</td>
                                <td style={lbl}>% Real</td><td style={val}>{pct(real)}</td>
                                <td style={lbl}>Término LB</td><td style={val}>{fmt(fimLB)}</td>
                                <td style={lbl}>Término tendência</td><td style={val}>{fmt(fimTend)}</td>
                            </tr>
                            <tr>
                                <td style={lbl}>Engº residente</td><td style={val}>{eng || '-'}</td>
                                <td style={lbl}>% Desvio</td><td style={{ ...val, fontWeight: 700, color: desvio != null && desvio > 0 ? '#b91c1c' : '#15803d' }}>{desvio == null ? '-' : `${desvio.toFixed(0)}%`}</td>
                                <td style={lbl} colSpan={2}></td><td style={lbl} colSpan={2}></td>
                            </tr>
                            <tr>
                                <td style={lbl}>Fiscal de obras</td><td style={val}>{fiscal || '-'}</td>
                                <td style={lbl}>Status</td><td style={{ ...val, fontWeight: 700, color: noPrazo == null ? '#1a1a1a' : (noPrazo ? '#15803d' : '#b91c1c') }}>{noPrazo == null ? '-' : (noPrazo ? 'No prazo' : 'Atrasada')}</td>
                                <td style={lbl} colSpan={2}></td><td style={lbl} colSpan={2}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* PARTE 2 — Ocorrências + Pluviométrico */}
                <div className="rep-sec" style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
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
                            <thead><tr><th style={lbl}>Período</th>{DIAS.map(([k, l]) => <th key={k} style={lbl}>{l}</th>)}</tr></thead>
                            <tbody>
                                {PERIODOS.map(([pk, pl]) => (
                                    <tr key={pk}><td style={{ ...tc, textAlign: 'left', fontWeight: 600 }}>{pl}</td>{DIAS.map(([dk]) => <td key={dk} style={tc}>{pluvio?.[dk]?.[pk] ? `${pluvio[dk][pk]}` : '0'}</td>)}</tr>
                                ))}
                                <tr><td style={{ ...tc, textAlign: 'left', fontWeight: 700, background: '#f3f4f6' }}>Total</td>{DIAS.map(([dk]) => <td key={dk} style={{ ...tc, fontWeight: 700, background: '#f3f4f6' }}>{totalDia(dk).toFixed(1)}</td>)}</tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PARTE 3 — Curva S */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>Curva S</div>
                    {curvaChart.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Cadastre a Linha de Base.</div> : (
                        <ResponsiveContainer width="100%" height={300}>
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

                {/* PARTE 4 — Histogramas */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>Histogramas (previsto × realizado)</div>
                    {histOrd.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem dados de histograma.</div> : (
                        [['MOI', 'moi_prev', 'moi_real'], ['MOD', 'mod_prev', 'mod_real'], ['Equipamentos', 'equip_prev', 'equip_real']].map(([titulo, p, r]) => (
                            <div key={titulo} style={{ marginBottom: '18px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{titulo}</div>
                                <ResponsiveContainer width="100%" height={170}>
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

                {/* PARTE 5 — Planejamento semanal realizado */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>Planejamento semanal — Realizado ({semanaObj ? fmtCurto(semanaObj.ref) + (semanaObj.fim ? ` a ${fmtCurto(semanaObj.fim)}` : '') : '-'})</div>
                    <MatrizSemana progRef={semanaSel} />
                </div>

                {/* PARTE 6 — Planejamento da próxima semana */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>Planejamento da próxima semana {proxProg ? `(${fmtCurto(proxProg.semana_referente_inicio)}${proxProg.semana_referente_fim ? ` a ${fmtCurto(proxProg.semana_referente_fim)}` : ''})` : ''}</div>
                    {proxProg ? <MatrizSemana progRef={proxProg.semana_referente_inicio} /> : <div style={{ fontSize: '12px', color: '#999' }}>Não há programação cadastrada para a próxima semana.</div>}
                </div>

                {/* PARTE 7 — PPC */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>Evolução do PPC — Planos Concluídos (média {ppcGeral.toFixed(0)}%)</div>
                    {ppcPorSemana.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem programações.</div> : (
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
                    )}
                </div>

                {/* PARTE 7b — Restrições, IRR e 5W2H */}
                <div className="rep-sec rep-break" style={card}>
                    <div style={h2}>Restrições — IRR {irr.toFixed(0)}% ({restRemovidas}/{restSemana.length} removidas)</div>
                    {restSemana.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem restrições nesta semana.</div> : (
                        <table style={tbl}>
                            <thead><tr><th style={{ ...lbl, textAlign: 'left' }}>Restrição</th><th style={lbl}>Categoria</th><th style={lbl}>Responsável</th><th style={lbl}>Prazo</th><th style={lbl}>Status</th></tr></thead>
                            <tbody>{restSemana.map((r: any) => <tr key={r.id}><td style={{ ...tc, textAlign: 'left' }}>{r.descricao}</td><td style={tc}>{CATEGORIAS[r.categoria] || r.categoria || '-'}</td><td style={tc}>{r.responsavel || '-'}</td><td style={tc}>{r.prazo_remocao ? fmt(r.prazo_remocao) : '-'}</td><td style={{ ...tc, fontWeight: 600, color: r.status === 'removida' ? '#15803d' : '#b91c1c' }}>{r.status === 'removida' ? 'Removida' : 'Pendente'}</td></tr>)}</tbody>
                        </table>
                    )}
                    <div style={{ ...h2, marginTop: '20px' }}>Planos de ação (5W2H)</div>
                    {analisesSemana.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem planos de ação nesta semana.</div> : (
                        <table style={tbl}>
                            <thead><tr>{['O quê', 'Por quê', 'Onde', 'Quando', 'Quem', 'Como', 'Status'].map(h => <th key={h} style={lbl}>{h}</th>)}</tr></thead>
                            <tbody>{analisesSemana.map((a: any) => <tr key={a.id}><td style={{ ...tc, textAlign: 'left' }}>{a.what_o_que || '-'}</td><td style={{ ...tc, textAlign: 'left' }}>{a.why_por_que || '-'}</td><td style={tc}>{a.where_onde || '-'}</td><td style={tc}>{a.when_quando ? fmt(a.when_quando) : '-'}</td><td style={tc}>{a.who_quem || '-'}</td><td style={{ ...tc, textAlign: 'left' }}>{a.how_como || '-'}</td><td style={{ ...tc, fontWeight: 600, color: a.status === 'concluido' ? '#15803d' : '#b45309' }}>{a.status === 'concluido' ? 'Concluído' : 'Em andamento'}</td></tr>)}</tbody>
                        </table>
                    )}
                </div>

                {/* PARTE 8 — Análise dos desvios (restrições) */}
                <div className="rep-sec" style={card}>
                    <div style={h2}>Análise dos desvios (restrições da semana)</div>
                    {restSemana.length === 0 ? <div style={{ fontSize: '12px', color: '#999' }}>Sem restrições nesta semana.</div> : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                            <table style={tbl}>
                                <thead><tr><th style={lbl}>Categoria</th><th style={lbl}>Qtd</th></tr></thead>
                                <tbody>{desviosPorCategoria.map(([cat, n]) => <tr key={cat}><td style={{ ...tc, textAlign: 'left' }}>{CATEGORIAS[cat] || cat}</td><td style={{ ...tc, fontWeight: 700 }}>{n}</td></tr>)}</tbody>
                            </table>
                            <table style={tbl}>
                                <thead><tr><th style={{ ...lbl, textAlign: 'left' }}>Restrição</th><th style={lbl}>Categoria</th><th style={lbl}>Responsável</th><th style={lbl}>Status</th></tr></thead>
                                <tbody>{restSemana.map((r: any) => <tr key={r.id}><td style={{ ...tc, textAlign: 'left' }}>{r.descricao}</td><td style={tc}>{CATEGORIAS[r.categoria] || r.categoria || '-'}</td><td style={tc}>{r.responsavel || '-'}</td><td style={{ ...tc, fontWeight: 600, color: r.status === 'removida' ? '#15803d' : '#b91c1c' }}>{r.status === 'removida' ? 'Removida' : 'Pendente'}</td></tr>)}</tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* PARTE 9 — Imagens */}
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
