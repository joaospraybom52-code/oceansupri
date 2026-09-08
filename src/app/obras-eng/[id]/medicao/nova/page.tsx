'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NovaMedicaoPage() {
    const router = useRouter()
    const { id } = useParams<{ id: string }>()
    const supabase = createClient()
    // 'medicao' = mede item a item na planilha do orçamento
    // 'direto'  = lança só o valor total, sem passar pela planilha
    // 'sinal'   = entrada/adiantamento da obra
    const [tipo, setTipo] = useState<'medicao' | 'direto' | 'sinal'>('medicao')
    const [valorDireto, setValorDireto] = useState('')
    const [inicio, setInicio] = useState('')
    const [fim, setFim] = useState('')
    const [dataSinal, setDataSinal] = useState('')
    const [valorSinal, setValorSinal] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (tipo === 'sinal') {
                const valor = parseFloat(String(valorSinal).replace(/\./g, '').replace(',', '.'))
                if (!dataSinal || isNaN(valor) || valor <= 0) {
                    setError('Informe a data e um valor de sinal válido.')
                    setLoading(false)
                    return
                }
                // Sinal: sem medição de itens — já nasce concluída com o valor
                const { error } = await supabase
                    .from('medicoes')
                    .insert({
                        obra_id: id,
                        periodo_inicio: dataSinal,
                        periodo_fim: dataSinal,
                        status: 'Concluída',
                        tipo: 'sinal',
                        valor_sinal: valor,
                    })
                if (error) throw error
                router.push(`/obras-eng/${id}/medicao`)
                router.refresh()
                return
            }

            if (!inicio || !fim) {
                setError('Preencha os períodos de início e fim.')
                setLoading(false)
                return
            }

            if (tipo === 'direto') {
                const valor = parseFloat(String(valorDireto).replace(/\./g, '').replace(',', '.'))
                if (isNaN(valor) || valor <= 0) {
                    setError('Informe um valor medido válido.')
                    setLoading(false)
                    return
                }
                // Valor direto: não passa pela planilha, já nasce concluída.
                const { error } = await supabase
                    .from('medicoes')
                    .insert({
                        obra_id: id,
                        periodo_inicio: inicio,
                        periodo_fim: fim,
                        status: 'Concluída',
                        tipo: 'medicao',
                        valor_direto: valor,
                    })
                if (error) throw error
                router.push(`/obras-eng/${id}/medicao`)
                router.refresh()
                return
            }

            const { data, error } = await supabase
                .from('medicoes')
                .insert({
                    obra_id: id,
                    periodo_inicio: inicio,
                    periodo_fim: fim,
                    status: 'Rascunho'
                })
                .select('id')
                .single()

            if (error) throw error

            router.push(`/obras-eng/${id}/medicao/${data.id}`)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const tipoBtn = (ativo: boolean, cor: string): React.CSSProperties => ({
        padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
        fontFamily: 'Inter, sans-serif', textAlign: 'center',
        background: ativo ? `${cor}22` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${ativo ? cor : 'var(--border-glass)'}`,
        color: ativo ? cor : 'var(--text-secondary)',
    })

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <Link href={`/obras-eng/${id}/medicao`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
                <ArrowLeft size={16} /> Voltar
            </Link>

            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>Criar Nova Medição</h2>

            <div className="glass-card" style={{ padding: '32px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Tipo: medição normal ou sinal */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <button type="button" onClick={() => setTipo('medicao')} style={tipoBtn(tipo === 'medicao', '#6366f1')}>
                            Pela planilha
                        </button>
                        <button type="button" onClick={() => setTipo('direto')} style={tipoBtn(tipo === 'direto', '#10b981')}>
                            Valor direto
                        </button>
                        <button type="button" onClick={() => setTipo('sinal')} style={tipoBtn(tipo === 'sinal', '#f59e0b')}>
                            Sinal
                        </button>
                    </div>

                    {tipo !== 'sinal' ? (
                        <>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                            {tipo === 'medicao'
                                ? 'Você mede item a item na planilha do orçamento, e o total sai da soma dos itens.'
                                : 'Você informa o valor total medido no período. A planilha não é usada — serve para quando o valor já vem fechado.'}
                        </p>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Período Início
                                </label>
                                <input
                                    type="date"
                                    value={inicio}
                                    onChange={(e) => setInicio(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Período Fim
                                </label>
                                <input
                                    type="date"
                                    value={fim}
                                    onChange={(e) => setFim(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>
                        {tipo === 'direto' && (
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Valor medido (R$)
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={valorDireto}
                                    onChange={(e) => setValorDireto(e.target.value)}
                                    className="input-field"
                                    placeholder="Ex: 150.000,00"
                                    required
                                />
                            </div>
                        )}
                        </>
                    ) : (
                        <>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                                Sinal/entrada da obra, sem medição física de itens. O valor entra direto no total medido da obra.
                            </p>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Data do Sinal
                                    </label>
                                    <input
                                        type="date"
                                        value={dataSinal}
                                        onChange={(e) => setDataSinal(e.target.value)}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Valor do Sinal (R$)
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={valorSinal}
                                        onChange={(e) => setValorSinal(e.target.value)}
                                        className="input-field"
                                        placeholder="Ex: 150.000,00"
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--accent-red-light)' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                        <button type="button" onClick={() => router.push(`/obras-eng/${id}/medicao`)} className="btn-secondary" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                            {loading ? 'Criando...'
                                : tipo === 'sinal' ? 'Registrar Sinal'
                                    : tipo === 'direto' ? 'Registrar Medição'
                                        : 'Salvar e Continuar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
