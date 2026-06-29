'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Calendar, Pencil, BarChart3, HardHat, Search } from 'lucide-react'

const anoDe = (d: string | null | undefined): number | null =>
    d ? new Date(d + 'T00:00:00').getFullYear() : null

export default function ObrasListClient({ obras, isAdmin }: { obras: any[]; isAdmin: boolean }) {
    const [busca, setBusca] = useState('')
    const [ano, setAno] = useState('')

    // Anos disponíveis (a partir das previsões de início/término).
    const anos = useMemo(() => {
        const set = new Set<number>()
        for (const o of obras) {
            const ini = anoDe(o.previsao_inicio)
            const fim = anoDe(o.previsao_termino)
            if (ini) set.add(ini)
            if (fim) set.add(fim)
        }
        return Array.from(set).sort((a, b) => b - a)
    }, [obras])

    const filtradas = useMemo(() => {
        const q = busca.trim().toLowerCase()
        const anoNum = ano ? parseInt(ano) : null
        return obras.filter(o => {
            if (q) {
                const cod = (o.codigo_uau || '').toString().toLowerCase()
                const nome = (o.nome || '').toString().toLowerCase()
                if (!cod.includes(q) && !nome.includes(q)) return false
            }
            if (anoNum) {
                const ini = anoDe(o.previsao_inicio)
                const fim = anoDe(o.previsao_termino)
                if (ini == null && fim == null) return false
                const lo = ini ?? fim!
                const hi = fim ?? ini!
                if (anoNum < lo || anoNum > hi) return false
            }
            return true
        })
    }, [obras, busca, ano])

    const inputStyle: React.CSSProperties = {
        padding: '10px 12px', fontSize: '14px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
        color: 'var(--text-primary)', outline: 'none',
    }

    return (
        <>
            {/* Barra de filtros */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        placeholder="Buscar por código UAU ou nome da obra…"
                        style={{ ...inputStyle, width: '100%', paddingLeft: '34px' }}
                    />
                </div>
                <select value={ano} onChange={e => setAno(e.target.value)} style={{ ...inputStyle, minWidth: '150px', cursor: 'pointer' }}>
                    <option value="">Todos os anos</option>
                    {anos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {filtradas.length} de {obras.length}
                </span>
            </div>

            {filtradas.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Nenhuma obra encontrada para os filtros aplicados.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {filtradas.map(obra => (
                        <div key={obra.id} className="glass-card hover-lift" style={{ padding: '20px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <HardHat size={20} color="var(--accent-green)" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{obra.nome}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 700,
                                                color: obra.status === 'Ativa' ? 'var(--accent-green)' : 'var(--text-muted)',
                                                background: obra.status === 'Ativa' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                                                padding: '2px 8px', borderRadius: '12px', display: 'inline-block',
                                                textTransform: 'uppercase', letterSpacing: '0.3px',
                                            }}>
                                                {obra.status}
                                            </span>
                                            {obra.codigo_uau && (
                                                <span style={{ fontSize: '11px', color: 'var(--accent-blue-light)', fontWeight: 600, background: 'rgba(99, 102, 241, 0.08)', padding: '2px 8px', borderRadius: '12px' }}>
                                                    UAU: {obra.codigo_uau}
                                                </span>
                                            )}
                                            {obra.local && (
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }} title={obra.local}>
                                                    📍 {obra.local}
                                                </span>
                                            )}
                                        </div>
                                        {(obra.previsao_inicio || obra.previsao_termino) && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                <Calendar size={13} />
                                                <span>
                                                    Previsão: {obra.previsao_inicio ? new Date(obra.previsao_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não def.'} — {obra.previsao_termino ? new Date(obra.previsao_termino + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não def.'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                                <Link href={`/obras-eng/${obra.id}/dashboard`} className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, padding: '10px 0' }}>
                                    <BarChart3 size={16} /> Painel
                                </Link>
                                <Link href={`/obras-eng/${obra.id}/medicao`} className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, padding: '10px 0' }}>
                                    <Calendar size={16} /> Medição
                                </Link>
                                {isAdmin && (
                                    <Link href={`/obras-eng/${obra.id}/editar`} className="btn-secondary" title="Editar Obra" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', padding: 0 }}>
                                        <Pencil size={16} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
