'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Save } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const CAMPOS = ['moi_prev', 'moi_real', 'mod_prev', 'mod_real', 'terc_prev', 'terc_real', 'equip_prev', 'equip_real'] as const
type Campo = typeof CAMPOS[number]
type Row = { semana_ref: string } & Record<Campo, string>

const toStr = (v: any) => v == null ? '' : String(v).replace('.', ',')
const toNum = (v: string): number | null => v.trim() === '' ? null : Number(v.replace(',', '.'))
const fmtData = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''

const novaLinha = (): Row => ({
    semana_ref: '', moi_prev: '', moi_real: '', mod_prev: '', mod_real: '',
    terc_prev: '', terc_real: '', equip_prev: '', equip_real: '',
})

/** Jornada da Constrowins: 8 h por dia, de segunda a sexta. */
const HORAS_DIA = 8

/** Dias úteis (seg a sex) da semana que começa em semana_ref. */
function diasUteis(semanaRef: string): number {
    if (!semanaRef) return 0
    const ini = new Date(semanaRef + 'T00:00:00')
    if (isNaN(ini.getTime())) return 0
    let n = 0
    for (let i = 0; i < 7; i++) {
        const d = new Date(ini)
        d.setDate(ini.getDate() + i)
        const dow = d.getDay()
        if (dow !== 0 && dow !== 6) n++
    }
    return n
}

const fmtHoras = (h: number) => `${Math.round(h).toLocaleString('pt-BR')} h`

const GRUPOS = [
    { titulo: 'Histograma de MOI (Mão de Obra Indireta)', prev: 'moi_prev', real: 'moi_real', ptw: true },
    { titulo: 'Histograma de MOD (Mão de Obra Direta)', prev: 'mod_prev', real: 'mod_real', ptw: true },
    { titulo: 'Histograma de MO Terceirizada', prev: 'terc_prev', real: 'terc_real', ptw: true },
    { titulo: 'Histograma de Equipamentos', prev: 'equip_prev', real: 'equip_real', ptw: false },
] as const

const COLUNAS: { campo: Campo, label: string }[] = [
    { campo: 'moi_prev', label: 'MOI Prev.' }, { campo: 'moi_real', label: 'MOI Real.' },
    { campo: 'mod_prev', label: 'MOD Prev.' }, { campo: 'mod_real', label: 'MOD Real.' },
    { campo: 'terc_prev', label: 'Terc. Prev.' }, { campo: 'terc_real', label: 'Terc. Real.' },
    { campo: 'equip_prev', label: 'Equip. Prev.' }, { campo: 'equip_real', label: 'Equip. Real.' },
]

export default function HistogramaClient({ obraId, initialSemanas, podeEditar, podeEditarPrevisto = false, podeGerenciarSemanas = false }: { obraId: string, initialSemanas: any[], podeEditar: boolean, podeEditarPrevisto?: boolean, podeGerenciarSemanas?: boolean }) {
    /** Colunas de PREVISTO: planejamento da obra, travadas para os demais. */
    const ehPrevisto = (campo: Campo) => campo.endsWith('_prev')
    const podeMexer = (campo: Campo) => ehPrevisto(campo) ? podeEditarPrevisto : podeEditar
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

    /**
     * PTW: horas do efetivo no período. Cada pessoa da semana vale
     * 8 h x dias úteis (sábado e domingo não contam).
     */
    const ptw = useMemo(() => {
        const soma = (campos: Campo[]) => ordenadas.reduce((acc, r) => {
            const pessoas = campos.reduce((s, c) => s + (toNum(r[c]) ?? 0), 0)
            return acc + pessoas * HORAS_DIA * diasUteis(r.semana_ref)
        }, 0)
        const horas = (campo: Campo) => soma([campo])
        return {
            horas,
            propriaPrev: soma(['moi_prev', 'mod_prev']),
            propriaReal: soma(['moi_real', 'mod_real']),
            tercPrev: soma(['terc_prev']),
            tercReal: soma(['terc_real']),
            totalPrev: soma(['moi_prev', 'mod_prev', 'terc_prev']),
            totalReal: soma(['moi_real', 'mod_real', 'terc_real']),
        }
    }, [ordenadas])

    function update(i: number, campo: keyof Row, valor: string) {
        setRows(rows.map((r, idx) => idx === i ? { ...r, [campo]: valor } : r))
    }
    const addRow = () => setRows([...rows, novaLinha()])
    const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))

    async function salvar() {
        // Quem não é do planejamento não cria nem apaga semana: a tela já esconde
        // os botões e aqui o salvamento refaz a lista de semanas como estava.
        const originais = new Map<string, any>((initialSemanas || []).map((s: any) => [String(s.semana_ref).slice(0, 10), s]))
        let validas = rows.filter(r => r.semana_ref)
        if (!podeGerenciarSemanas) {
            const mantidas = validas.filter(r => originais.has(r.semana_ref))
            const faltando = [...originais.keys()].filter(k => !mantidas.some(r => r.semana_ref === k))
            validas = [...mantidas, ...faltando.map(k => {
                const r = novaLinha(); r.semana_ref = k
                CAMPOS.forEach(c => { r[c] = toStr(originais.get(k)?.[c]) })
                return r
            })]
        }
        const refs = validas.map(r => r.semana_ref)
        if (new Set(refs).size !== refs.length) { toast.error('Há semanas com a mesma data.'); return }
        setSaving(true)
        await supabase.from('histograma_semanas' as any).delete().eq('obra_id', obraId)
        if (validas.length > 0) {
            // Sem permissão de planejamento, o Previsto é gravado como estava —
            // a tela já bloqueia, isto é a rede de segurança do salvamento.
            const payload = validas.sort((a, b) => a.semana_ref.localeCompare(b.semana_ref)).map((r, idx) => {
                const o: any = { obra_id: obraId, semana_ref: r.semana_ref, ordem: idx }
                const antes = originais.get(r.semana_ref)
                CAMPOS.forEach(c => {
                    o[c] = (ehPrevisto(c) && !podeEditarPrevisto) ? (antes ? toNum(toStr(antes[c])) : null) : toNum(r[c])
                })
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

    /** Faixa de PTW no rodapé de cada gráfico de mão de obra. */
    function FaixaPtw({ prev, real }: { prev: Campo, real: Campo }) {
        const hp = ptw.horas(prev), hr = ptw.horas(real)
        const pct = hp > 0 ? (hr / hp) * 100 : null
        return (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-muted)' }}>PTW</span>
                <span style={{ fontSize: '12px', color: '#3b82f6' }}>Previsto <b style={{ color: 'var(--text-primary)' }}>{fmtHoras(hp)}</b></span>
                <span style={{ fontSize: '12px', color: '#10b981' }}>Realizado <b style={{ color: 'var(--text-primary)' }}>{fmtHoras(hr)}</b></span>
                {pct != null && <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{pct.toFixed(0)}% do previsto</span>}
            </div>
        )
    }

    const CardPtw = ({ titulo, prev, real, destaque }: { titulo: string, prev: number, real: number, destaque?: boolean }) => {
        const pct = prev > 0 ? (real / prev) * 100 : null
        return (
            <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: destaque ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700 }}>{titulo}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0 2px' }}>{fmtHoras(real)}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    previsto {fmtHoras(prev)}{pct != null && ` · ${pct.toFixed(0)}%`}
                </div>
            </div>
        )
    }

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
                            {g.ptw && data.length > 0 && <FaixaPtw prev={g.prev} real={g.real} />}
                        </div>
                    )
                })}
            </div>

            {/* PTW consolidado — mão de obra própria x terceirizada */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>PTW — horas de mão de obra</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Efetivo da semana × {HORAS_DIA} h/dia × dias úteis (sábado e domingo não contam)
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <CardPtw titulo="MO própria (MOI + MOD)" prev={ptw.propriaPrev} real={ptw.propriaReal} />
                    <CardPtw titulo="MO terceirizada" prev={ptw.tercPrev} real={ptw.tercReal} />
                    <CardPtw titulo="Total" prev={ptw.totalPrev} real={ptw.totalReal} destaque />
                </div>
            </div>

            {/* Grade */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recursos por semana (previsto × realizado)</h3>
                    {podeEditar && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {podeGerenciarSemanas && (
                                <button onClick={addRow} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Semana</button>
                            )}
                            <button onClick={salvar} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, textAlign: 'left' }}>
                                    Semana
                                    {podeEditar && !podeEditarPrevisto && (
                                        <span style={{ display: 'block', fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>
                                            🔒 Previsto e as semanas são do planejamento — você edita só o realizado
                                        </span>
                                    )}
                                </th>
                                {COLUNAS.map(c => <th key={c.campo} style={{ ...th, textAlign: 'center' }}>{c.label}</th>)}
                                <th style={{ ...th, textAlign: 'center' }}>PTW real.</th>
                                {podeGerenciarSemanas && <th style={th}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr><td style={{ ...td, color: 'var(--text-muted)', textAlign: 'center' }} colSpan={podeGerenciarSemanas ? COLUNAS.length + 3 : COLUNAS.length + 2}>Nenhuma semana cadastrada.</td></tr>
                            )}
                            {rows.map((r, i) => {
                                const pessoas = (toNum(r.moi_real) ?? 0) + (toNum(r.mod_real) ?? 0) + (toNum(r.terc_real) ?? 0)
                                const horasSemana = pessoas * HORAS_DIA * diasUteis(r.semana_ref)
                                return (
                                    <tr key={i}>
                                        <td style={td}>
                                            <input type="date" value={r.semana_ref} onChange={e => update(i, 'semana_ref', e.target.value)} className="input-field" style={{ padding: '6px 8px', opacity: podeGerenciarSemanas ? 1 : 0.7 }} disabled={!podeGerenciarSemanas}
                                                title={podeGerenciarSemanas ? undefined : 'As semanas do histograma são do planejamento — só admin ou perfil Planejamento inclui ou altera'} />
                                        </td>
                                        {CAMPOS.map(campo => (
                                            <td style={td} key={campo}>
                                                <input
                                                    type="text" inputMode="decimal" value={r[campo]}
                                                    onChange={e => update(i, campo, e.target.value)}
                                                    className="input-field"
                                                    title={ehPrevisto(campo) && !podeEditarPrevisto ? 'O Previsto é do planejamento — só admin ou perfil Planejamento altera' : undefined}
                                                    style={{ padding: '6px 8px', width: '64px', textAlign: 'center', opacity: podeMexer(campo) ? 1 : 0.55, cursor: podeMexer(campo) ? 'auto' : 'not-allowed' }}
                                                    placeholder="-" disabled={!podeMexer(campo)}
                                                />
                                            </td>
                                        ))}
                                        <td style={{ ...td, textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {horasSemana > 0 ? fmtHoras(horasSemana) : '—'}
                                        </td>
                                        {podeGerenciarSemanas && (
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
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                    P = previsto, R = realizado. MOI: mão de obra indireta · MOD: mão de obra direta · Terc.: mão de obra terceirizada.
                    A coluna PTW real. é a hora-homem da semana (MOI + MOD + terceirizada × {HORAS_DIA} h × dias úteis).
                </p>
            </div>
        </div>
    )
}
