'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, ShieldCheck, ListChecks, Trophy } from 'lucide-react'
import type { ObraChartData } from './GlobalCharts'

const STATUS_OPCOES = [
    { v: 'todas', label: 'Todas as obras' },
    { v: 'em_andamento', label: 'Em andamento' },
    { v: 'planejamento', label: 'Planejamento' },
    { v: 'concluida', label: 'Concluída' },
]

const pct = (v: number) => `${(v || 0).toFixed(1)}%`

function cor(v: number) {
    if (v >= 80) return '#10b981'
    if (v >= 50) return '#f59e0b'
    return '#ef4444'
}

function Ranking({ titulo, icon: Icon, accent, itens, vazio }: {
    titulo: string
    icon: React.ElementType
    accent: string
    itens: { nome: string; valor: number; sub?: string }[]
    vazio: string
}) {
    return (
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: `${accent}1f` }}>
                    <Icon size={18} color={accent} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{titulo}</h3>
            </div>
            {itens.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{vazio}</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {itens.map((it, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                                width: 22, height: 22, borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 800,
                                background: i === 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)',
                                color: i === 0 ? '#fbbf24' : 'var(--text-muted)',
                            }}>{i + 1}</span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nome}</div>
                                <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(it.valor, 100)}%`, height: '100%', background: cor(it.valor), borderRadius: '3px' }} />
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: cor(it.valor) }}>{pct(it.valor)}</div>
                                {it.sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{it.sub}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function RankingsObras({ obras }: { obras: ObraChartData[] }) {
    const [status, setStatus] = useState('todas')

    const filtradas = useMemo(
        () => (status === 'todas' ? obras : obras.filter(o => o.status === status)),
        [obras, status]
    )

    const rankPrazo = useMemo(() =>
        filtradas.filter(o => (o.progEnviadas ?? 0) > 0)
            .sort((a, b) => (b.aderenciaPrazo ?? 0) - (a.aderenciaPrazo ?? 0))
            .slice(0, 5)
            .map(o => ({ nome: o.nome, valor: o.aderenciaPrazo ?? 0, sub: `${o.progEnviadas} programações` })),
        [filtradas])

    const rankIrr = useMemo(() =>
        filtradas.filter(o => (o.restricoesTotal ?? 0) > 0)
            .sort((a, b) => (b.irr ?? 0) - (a.irr ?? 0))
            .slice(0, 5)
            .map(o => ({ nome: o.nome, valor: o.irr ?? 0, sub: `${o.restricoesRemovidas}/${o.restricoesTotal} removidas` })),
        [filtradas])

    const rankPpc = useMemo(() =>
        filtradas.filter(o => (o.progEnviadas ?? 0) > 0)
            .sort((a, b) => (b.ppcMedio ?? 0) - (a.ppcMedio ?? 0))
            .slice(0, 5)
            .map(o => ({ nome: o.nome, valor: o.ppcMedio ?? 0 })),
        [filtradas])

    // Médias globais (do filtro)
    const mediaPrazo = rankPrazo.length ? filtradas.filter(o => (o.progEnviadas ?? 0) > 0).reduce((s, o) => s + (o.aderenciaPrazo ?? 0), 0) / filtradas.filter(o => (o.progEnviadas ?? 0) > 0).length : 0
    const totRestr = filtradas.reduce((s, o) => s + (o.restricoesTotal ?? 0), 0)
    const totRem = filtradas.reduce((s, o) => s + (o.restricoesRemovidas ?? 0), 0)
    const irrGlobal = totRestr > 0 ? (totRem / totRestr) * 100 : 0
    const ppcObras = filtradas.filter(o => (o.progEnviadas ?? 0) > 0)
    const ppcGlobal = ppcObras.length ? ppcObras.reduce((s, o) => s + (o.ppcMedio ?? 0), 0) / ppcObras.length : 0

    return (
        <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Trophy size={20} color="#fbbf24" />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Rankings de Planejamento</h2>
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)} className="select-field" style={{ maxWidth: '220px' }}>
                    {STATUS_OPCOES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
            </div>

            {/* Médias do conjunto filtrado */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div className="glass-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aderência média ao prazo</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: cor(mediaPrazo) }}>{pct(mediaPrazo)}</div>
                </div>
                <div className="glass-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>IRR global (restrições)</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: cor(irrGlobal) }}>{pct(irrGlobal)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{totRem}/{totRestr} removidas</div>
                </div>
                <div className="glass-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PPC médio (planos concluídos)</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: cor(ppcGlobal) }}>{pct(ppcGlobal)}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <Ranking titulo="Programação no prazo" icon={CalendarCheck} accent="#10b981" itens={rankPrazo}
                    vazio="Nenhuma programação enviada ainda." />
                <Ranking titulo="Melhor IRR (remoção de restrições)" icon={ShieldCheck} accent="#6366f1" itens={rankIrr}
                    vazio="Nenhuma restrição cadastrada ainda." />
                <Ranking titulo="Melhor PPC (planos concluídos)" icon={ListChecks} accent="#8b5cf6" itens={rankPpc}
                    vazio="Nenhuma tarefa programada ainda." />
            </div>
        </div>
    )
}
