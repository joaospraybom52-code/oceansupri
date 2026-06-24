'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Save } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const CAMPOS = ['moi_prev', 'moi_real', 'mod_prev', 'mod_real', 'equip_prev', 'equip_real'] as const
type Campo = typeof CAMPOS[number]
type Row = { semana_ref: string } & Record<Campo, string>

const toStr = (v: any) => v == null ? '' : String(v).replace('.', ',')
const toNum = (v: string): number | null => v.trim() === '' ? null : Number(v.replace(',', '.'))
const fmtData = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''

const novaLinha = (): Row => ({ semana_ref: '', moi_prev: '', moi_real: '', mod_prev: '', mod_real: '', equip_prev: '', equip_real: '' })

const GRUPOS = [
    { titulo: 'Histograma de MOI (Mão de Obra Indireta)', prev: 'moi_prev', real: 'moi_real' },
    { titulo: 'Histograma de MOD (Mão de Obra Direta)', prev: 'mod_prev', real: 'mod_real' },
    { titulo: 'Histograma de Equipamentos', prev: 'equip_prev', real: 'equip_real' },
] as const

export default function HistogramaClient({ obraId, initialSemanas, podeEditar }: { obraId: string, initialSemanas: any[], podeEditar: boolean }) {
    const supabase = createClient()
    const router = useRouter()
    const [rows, setRows] = useState<Row[]>(
        initialSemanas.map(s => {
            const r = novaLinha(); r.semana_ref = s.semana_ref
            CAMPOS.forEach(c => { r[c] = toStr(s[c]) })
            return r
        })
    )
    const [saving, setSaving] = useState(false)

    const ordenadas = useMemo(() => [...rows].filter(r => r.semana_ref).sort((a, b) => a.semana_ref.localeCompare(b.semana_ref)), [rows])

    function chartData(prev: Campo, real: Campo) {
        return ordenadas.map(r => ({ label: fmtData(r.semana_ref), Previsto: toNum(r[prev]), Realizado: toNum(r[real]) }))
    }

    function update(i: number, campo: keyof Row, valor: string) {
        setRows(rows.map((r, idx) => idx === i ? { ...r, [campo]: valor } : r))
    }
    const addRow = () => setRows([...rows, novaLinha()])
    const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))

    async function salvar() {
        const validas = rows.filter(r => r.semana_ref)
        const refs = validas.map(r => r.semana_ref)
        if (new Set(refs).size !== refs.length) { toast.error('Há semanas com a mesma data.'); return }
        setSaving(true)
        await supabase.from('histograma_semanas' as any).delete().eq('obra_id', obraId)
        if (validas.length > 0) {
            const payload = validas.sort((a, b) => a.semana_ref.localeCompare(b.semana_ref)).map((r, idx) => {
                const o: any = { obra_id: obraId, semana_ref: r.semana_ref, ordem: idx }
                CAMPOS.forEach(c => { o[c] = toNum(r[c]) })
                return o
            })
            const { error } = await supabase.from('histograma_semanas' as any).insert(payload)
            if (error) { toast.error('Erro ao salvar: ' + error.message); setSaving(false); return }
        }
        toast.success('Histograma salvo!')
        router.refresh()
        setSaving(false)
    }

    const th: React.CSSProperties = { padding: '8px 10px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }
    const td: React.CSSProperties = { padding: '5px 10px', borderTop: '1px solid var(--border-glass)' }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Gráficos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
                {GRUPOS.map(g => {
                    const data = chartData(g.prev, g.real)
                    return (
                        <div key={g.titulo} className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>{g.titulo}</h3>
                            {data.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Sem dados.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar dataKey="Previsto" fill="#3b82f6" />
                                        <Bar dataKey="Realizado" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Grade */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recursos por semana (previsto × realizado)</h3>
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
                                <th style={{ ...th, textAlign: 'left' }}>Semana</th>
                                <th style={th} colSpan={2}>MOI (P / R)</th>
                                <th style={th} colSpan={2}>MOD (P / R)</th>
                                <th style={th} colSpan={2}>Equip. (P / R)</th>
                                {podeEditar && <th style={th}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr><td style={{ ...td, color: 'var(--text-muted)', textAlign: 'center' }} colSpan={podeEditar ? 8 : 7}>Nenhuma semana cadastrada.</td></tr>
                            )}
                            {rows.map((r, i) => (
                                <tr key={i}>
                                    <td style={td}>
                                        <input type="date" value={r.semana_ref} onChange={e => update(i, 'semana_ref', e.target.value)} className="input-field" style={{ padding: '6px 8px' }} disabled={!podeEditar} />
                                    </td>
                                    {CAMPOS.map(campo => (
                                        <td style={td} key={campo}>
                                            <input type="text" inputMode="decimal" value={r[campo]} onChange={e => update(i, campo, e.target.value)} className="input-field" style={{ padding: '6px 8px', width: '64px', textAlign: 'center' }} placeholder="-" disabled={!podeEditar} />
                                        </td>
                                    ))}
                                    {podeEditar && (
                                        <td style={td}>
                                            <button onClick={() => removeRow(i)} title="Excluir semana" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>P = previsto, R = realizado. MOI: mão de obra indireta · MOD: mão de obra direta.</p>
            </div>
        </div>
    )
}
