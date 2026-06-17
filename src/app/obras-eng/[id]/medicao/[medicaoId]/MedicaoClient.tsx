'use client'

import { useState } from 'react'
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function MedicaoClient({ obraId, medicao, dadosTabela }: { obraId: string, medicao: any, dadosTabela: any[] }) {
    const supabase = createClient()
    const router = useRouter()
    
    // Estado local para os inputs
    const [itens, setItens] = useState(dadosTabela)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Formatação
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val)
    
    const totalOrcado = itens.reduce((acc, i) => acc + (i.valor_total_orcado || 0), 0)

    // Atualiza linha quando o usuário digita
    const handleUpdate = (index: number, field: 'atual_quantidade' | 'atual_percentual', valueStr: string) => {
        let val = parseFloat(valueStr)
        if (isNaN(val)) val = 0

        const newItens = [...itens]
        const item = newItens[index]

        const qtyOrcada = Number(item.quantidade_orcada || 0)
        const valTotalOrcado = Number(item.valor_total_orcado || 0)

        if (field === 'atual_quantidade') {
            item.atual_quantidade = val
            item.atual_percentual = qtyOrcada > 0 ? (val / qtyOrcada) * 100 : 0
            item.atual_valor = qtyOrcada > 0 ? (val / qtyOrcada) * valTotalOrcado : 0
        } else {
            item.atual_percentual = val
            item.atual_quantidade = qtyOrcada > 0 ? (val / 100) * qtyOrcada : 0
            item.atual_valor = (val / 100) * valTotalOrcado
        }

        setItens(newItens)
        setSaved(false)
    }

    const handleSave = async (concluir = false) => {
        setSaving(true)
        setSaved(false)

        try {
            // Preparar dados para medicao_itens
            const upserts = itens.filter(i => i.atual_quantidade > 0 || i.atual_id).map(i => {
                const row: any = {
                    medicao_id: medicao.id,
                    item_id: i.id,
                    quantidade_medida: i.atual_quantidade,
                    valor_medido: i.atual_valor,
                    percentual_medido: i.atual_percentual
                }
                if (i.atual_id) row.id = i.atual_id // Se já existe, atualiza
                return row
            })

            if (upserts.length > 0) {
                const { error } = await supabase.from('medicao_itens').upsert(upserts)
                if (error) throw error
            }

            if (concluir) {
                const { error } = await supabase.from('medicoes').update({ status: 'Concluída' }).eq('id', medicao.id)
                if (error) throw error
                router.push(`/obras-eng/${obraId}/medicao`)
            } else {
                setSaved(true)
                toast.success('Medição salva com sucesso!')
                setTimeout(() => setSaved(false), 3000)
            }

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao salvar medição: ' + (error.message || JSON.stringify(error)))
        } finally {
            setSaving(false)
        }
    }

    const handleReopen = async () => {
        setSaving(true)
        try {
            const { error } = await supabase.from('medicoes').update({ status: 'Em Andamento' }).eq('id', medicao.id)
            if (error) throw error
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao reabrir medição: ' + (error.message || JSON.stringify(error)))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <Link href={`/obras-eng/${obraId}/medicao`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
                        <ArrowLeft size={16} /> Voltar
                    </Link>
                    <h2 style={{ fontSize: '24px', fontWeight: 800 }}>
                        Medição ({new Date(medicao.periodo_inicio).toLocaleDateString('pt-BR')} a {new Date(medicao.periodo_fim).toLocaleDateString('pt-BR')})
                    </h2>
                    <span style={{
                        fontSize: '11px', fontWeight: 600, marginTop: '8px', display: 'inline-block',
                        color: medicao.status === 'Concluída' ? 'var(--accent-green)' : 'var(--accent-blue)',
                        background: medicao.status === 'Concluída' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        padding: '4px 10px', borderRadius: '12px'
                    }}>
                        Status: {medicao.status}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {saved && <span style={{ color: 'var(--accent-green)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={16}/> Salvo</span>}
                    
                    {medicao.status !== 'Concluída' ? (
                        <>
                            <button onClick={() => handleSave(false)} className="btn-secondary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Save size={16} /> Salvar Rascunho
                            </button>
                            <button onClick={() => handleSave(true)} className="btn-primary" disabled={saving}>
                                Concluir Medição
                            </button>
                        </>
                    ) : (
                        <button onClick={handleReopen} className="btn-secondary" disabled={saving}>
                            Reabrir Medição
                        </button>
                    )}
                </div>
            </div>

            {/* Planilha de Medição */}
            <div className="glass-card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1300px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)' }}>ITEM</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>UND</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-glass)' }}>QTD ORÇADA</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>QTD RESTANTE</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>VL. TOTAL</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>PESO %</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', color: 'var(--accent-blue)', borderLeft: '1px solid var(--border-glass)' }}>ACUM. ANTERIOR</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: 'var(--accent-green)', borderLeft: '1px solid var(--border-glass)' }} colSpan={2}>NO PERÍODO (ATUAL)</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', color: 'var(--text-primary)', borderLeft: '1px solid var(--border-glass)' }}>VALOR MEDIDO</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', color: 'var(--accent-red)', borderLeft: '1px solid var(--border-glass)' }}>SALDO</th>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                            <th colSpan={7}></th>
                            <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-glass)' }}>QTD</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>%</th>
                            <th colSpan={2}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {itens.map((item, index) => {
                            const acumuladoQtd = Number(item.anterior_quantidade || 0) + Number(item.atual_quantidade || 0)
                            const acumuladoValor = Number(item.anterior_valor || 0) + Number(item.atual_valor || 0)
                            const acumuladoPerc = Number(item.quantidade_orcada || 0) > 0 ? (acumuladoQtd / Number(item.quantidade_orcada || 0)) * 100 : 0
                            const saldoValor = Number(item.valor_total_orcado || 0) - acumuladoValor
                            const saldoQtd = Number(item.quantidade_orcada || 0) - acumuladoQtd

                            return (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.1s' }} className="table-row-hover">
                                    <td style={{ padding: '12px', fontSize: '12px' }}>
                                        <div style={{ fontWeight: 600 }}>{item.codigo}</div>
                                        <div style={{ color: 'var(--text-secondary)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.descricao}>
                                            {item.descricao}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{item.unidade}</td>
                                    
                                    {/* Orçado */}
                                    <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', borderLeft: '1px solid var(--border-glass)' }}>{formatNumber(Number(item.quantidade_orcada || 0))}</td>
                                    <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', color: saldoQtd < 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{formatNumber(saldoQtd)}</td>
                                    <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right' }}>{formatCurrency(Number(item.valor_total_orcado || 0))}</td>
                                    <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', fontWeight: 600 }}>
                                        {formatNumber(totalOrcado > 0 ? (Number(item.valor_total_orcado || 0) / totalOrcado) * 100 : 0)}%
                                    </td>

                                    {/* Anterior */}
                                    <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', color: 'var(--accent-blue-light)', borderLeft: '1px solid var(--border-glass)' }}>
                                        <div style={{ fontWeight: 600 }}>{formatCurrency(Number(item.anterior_valor || 0))}</div>
                                        <div style={{ fontSize: '10px', opacity: 0.8 }}>{formatNumber(Number(item.quantidade_orcada || 0) > 0 ? (Number(item.anterior_quantidade || 0) / Number(item.quantidade_orcada || 0)) * 100 : 0)}%</div>
                                    </td>

                                    {/* Atual */}
                                    <td style={{ padding: '8px', textAlign: 'center', borderLeft: '1px solid var(--border-glass)' }}>
                                        <input 
                                            type="number" 
                                            value={item.atual_quantidade === 0 ? '' : item.atual_quantidade} 
                                            onChange={(e) => handleUpdate(index, 'atual_quantidade', e.target.value)}
                                            disabled={medicao.status === 'Concluída'}
                                            style={{
                                                width: '60px', padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', 
                                                borderRadius: '4px', color: 'white', textAlign: 'right', fontSize: '12px'
                                            }} 
                                            placeholder="0"
                                        />
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                            <input 
                                                type="number" 
                                                value={item.atual_percentual === 0 ? '' : Number(item.atual_percentual).toFixed(2)} 
                                                onChange={(e) => handleUpdate(index, 'atual_percentual', e.target.value)}
                                                disabled={medicao.status === 'Concluída'}
                                                style={{
                                                    width: '50px', padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', 
                                                    borderRadius: '4px', color: 'var(--accent-green)', textAlign: 'right', fontSize: '12px', fontWeight: 600
                                                }} 
                                                placeholder="0"
                                            />
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>%</span>
                                        </div>
                                    </td>

                                    {/* Acumulado */}
                                    <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', borderLeft: '1px solid var(--border-glass)' }}>
                                        <div style={{ fontWeight: 600 }}>{formatCurrency(acumuladoValor)}</div>
                                        <div style={{ fontSize: '10px', color: acumuladoPerc >= 100 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{formatNumber(acumuladoPerc)}%</div>
                                    </td>

                                    {/* Saldo */}
                                    <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', color: saldoValor < 0 ? 'var(--accent-red)' : 'var(--text-secondary)', borderLeft: '1px solid var(--border-glass)' }}>
                                        {formatCurrency(saldoValor)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <style jsx>{`
                .table-row-hover:hover {
                    background: rgba(255,255,255,0.02) !important;
                }
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            `}</style>
        </div>
    )
}
