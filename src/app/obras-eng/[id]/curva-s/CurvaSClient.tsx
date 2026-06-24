'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Save } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { calcularTendencia, SemanaCurva } from '@/lib/utils/curva-s'

interface Row {
    semana_ref: string
    lb1_pct: string
    lb2_pct: string
    real_pct: string
}

const toStr = (v: any) => v == null ? '' : String(v).replace('.', ',')
const toNum = (v: string): number | null => v.trim() === '' ? null : Number(v.replace(',', '.'))
const fmtData = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''

export default function CurvaSClient({ obraId, initialSemanas, podeEditar }: { obraId: string, initialSemanas: any[], podeEditar: boolean }) {
    const supabase = createClient()
    const router = useRouter()
    const [rows, setRows] = useState<Row[]>(
        initialSemanas.map(s => ({ semana_ref: s.semana_ref, lb1_pct: toStr(s.lb1_pct), lb2_pct: toStr(s.lb2_pct), real_pct: toStr(s.real_pct) }))
    )
    const [saving, setSaving] = useState(false)

    const ordenadas = useMemo(() => [...rows].sort((a, b) => a.semana_ref.localeCompare(b.semana_ref)), [rows])

    const comTendencia = useMemo(() => {
        const base: SemanaCurva[] = ordenadas
            .filter(r => r.semana_ref)
            .map(r => ({ semana_ref: r.semana_ref, lb1_pct: toNum(r.lb1_pct), lb2_pct: toNum(r.lb2_pct), real_pct: toNum(r.real_pct) }))
        return calcularTendencia(base)
    }, [ordenadas])

    const chartData = comTendencia.map(s => ({
        label: fmtData(s.semana_ref),
        'LB 1': s.lb1_pct, 'LB 2': s.lb2_pct, 'Tendência': s.tendencia_pct, 'Real': s.real_pct,
    }))

    function update(i: number, campo: keyof Row, valor: string) {
        setRows(rows.map((r, idx) => idx === i ? { ...r, [campo]: valor } : r))
    }
    function addRow() {
        setRows([...rows, { semana_ref: '', lb1_pct: '', lb2_pct: '', real_pct: '' }])
    }
    function removeRow(i: number) {
        setRows(rows.filter((_, idx) => idx !== i))
    }

    async function salvar() {
        const validas = rows.filter(r => r.semana_ref)
        const refs = validas.map(r => r.semana_ref)
        if (new Set(refs).size !== refs.length) {
            toast.error('Há semanas com a mesma data. Use datas distintas.')
            return
        }
        setSaving(true)
        await supabase.from('curva_s_semanas' as any).delete().eq('obra_id', obraId)
        if (validas.length > 0) {
            const payload = validas
                .sort((a, b) => a.semana_ref.localeCompare(b.semana_ref))
                .map((r, idx) => ({
                    obra_id: obraId, semana_ref: r.semana_ref, ordem: idx,
                    lb1_pct: toNum(r.lb1_pct), lb2_pct: toNum(r.lb2_pct), real_pct: toNum(r.real_pct),
                }))
            const { error } = await supabase.from('curva_s_semanas' as any).insert(payload)
            if (error) { toast.error('Erro ao salvar: ' + error.message); setSaving(false); return }
        }
        toast.success('Curva S salva!')
        router.refresh()
        setSaving(false)
    }

    const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }
    const td: React.CSSProperties = { padding: '6px 12px', borderTop: '1px solid var(--border-glass)' }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Gráfico */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Curva S</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Linha de Base (planejado), Tendência (projeção pelo ritmo atual) e Real.
                </p>
                {chartData.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Cadastre as semanas abaixo para ver a curva.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={360}>
                        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                            <Tooltip formatter={(v: any) => v == null ? '-' : `${Number(v).toFixed(1)}%`} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Line type="monotone" dataKey="LB 1" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                            <Line type="monotone" dataKey="LB 2" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
                            <Line type="monotone" dataKey="Tendência" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls />
                            <Line type="monotone" dataKey="Real" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Grade */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Semanas</h3>
                    {podeEditar && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={addRow} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Semana</button>
                            <button onClick={salvar} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={th}>Semana</th>
                                <th style={th}>LB 1 (%)</th>
                                <th style={th}>LB 2 (%)</th>
                                <th style={th}>Real (%)</th>
                                <th style={th}>Tendência (%)</th>
                                {podeEditar && <th style={th}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr><td style={{ ...td, color: 'var(--text-muted)', textAlign: 'center' }} colSpan={podeEditar ? 6 : 5}>Nenhuma semana cadastrada.</td></tr>
                            )}
                            {rows.map((r, i) => {
                                const tend = comTendencia.find(s => s.semana_ref === r.semana_ref)?.tendencia_pct
                                return (
                                    <tr key={i}>
                                        <td style={td}>
                                            <input type="date" value={r.semana_ref} onChange={e => update(i, 'semana_ref', e.target.value)} className="input-field" style={{ padding: '6px 8px' }} disabled={!podeEditar} />
                                        </td>
                                        {(['lb1_pct', 'lb2_pct', 'real_pct'] as const).map(campo => (
                                            <td style={td} key={campo}>
                                                <input type="text" inputMode="decimal" value={r[campo]} onChange={e => update(i, campo, e.target.value)} className="input-field" style={{ padding: '6px 8px', width: '90px' }} placeholder="-" disabled={!podeEditar} />
                                            </td>
                                        ))}
                                        <td style={{ ...td, fontWeight: 600, color: 'var(--accent-amber, #f59e0b)' }}>
                                            {tend == null ? '-' : `${tend.toFixed(1)}%`}
                                        </td>
                                        {podeEditar && (
                                            <td style={td}>
                                                <button onClick={() => removeRow(i)} title="Excluir semana" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {podeEditar && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>A Tendência é calculada automaticamente a partir do Real e da LB 1. Lembre de clicar em <strong>Salvar</strong>.</p>}
            </div>
        </div>
    )
}
