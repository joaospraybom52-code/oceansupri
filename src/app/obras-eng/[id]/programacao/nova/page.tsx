'use client'

import { useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function NovaProgramacaoForm() {
    const router = useRouter()
    const { id } = useParams<{ id: string }>()
    const searchParams = useSearchParams()
    const supabase = createClient()

        // Calculate default deadline: Sunday of the week before 'inicio'
        const calculateDeadline = (inicioDateStr: string) => {
            if (!inicioDateStr) return ''
            const d = new Date(inicioDateStr + 'T12:00:00') // Use noon to avoid timezone shift
            d.setDate(d.getDate() - 1) // Go back 1 day to Sunday
            const yyyy = d.getFullYear()
            const mm = String(d.getMonth() + 1).padStart(2, '0')
            const dd = String(d.getDate()).padStart(2, '0')
            return `${yyyy}-${mm}-${dd}T23:59` // Sunday 23:59
        }

    const [inicio, setInicio] = useState(searchParams.get('inicio') || '')
    const [fim, setFim] = useState(searchParams.get('fim') || '')
    const [prazo, setPrazo] = useState(calculateDeadline(searchParams.get('inicio') || ''))
    const [responsavel, setResponsavel] = useState('')
    
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Auto-update deadline if 'inicio' changes (though it will be readOnly)
    const handleInicioChange = (val: string) => {
        setInicio(val)
        setPrazo(calculateDeadline(val))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!inicio || !fim || !prazo || !responsavel) {
            setError('Preencha todos os campos.')
            return
        }

        setError('')
        setSuccess('')
        setLoading(true)

        try {
            // Criar já é o envio: dentro do prazo -> no_prazo; depois do prazo -> atrasada.
            const agora = new Date()
            const isAtrasado = agora > new Date(prazo)

            const { data, error: insertError } = await supabase
                .from('programacoes_semanais')
                .insert({
                    obra_id: id,
                    semana_referente_inicio: inicio,
                    semana_referente_fim: fim,
                    prazo_envio: new Date(prazo).toISOString(),
                    responsavel: responsavel,
                    status_envio: isAtrasado ? 'atrasada' : 'no_prazo',
                    data_envio: agora.toISOString()
                })
                .select('id')
                .single()

            if (insertError) throw insertError

            setSuccess('Programação criada com sucesso!')
            setTimeout(() => {
                router.push(`/obras-eng/${id}/programacao/${data.id}`)
                router.refresh()
            }, 1000)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <Link href={`/obras-eng/${id}/programacao`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
                    <ArrowLeft size={16} /> Voltar para Programações
                </Link>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
                    Nova Programação Semanal
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Crie um novo ciclo de planejamento (Last Planner) para a obra.
                </p>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Início da Semana (Segunda)
                            </label>
                            <input
                                type="date"
                                value={inicio}
                                onChange={(e) => handleInicioChange(e.target.value)}
                                className="input-field"
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                                readOnly
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Fim da Semana (Sexta/Sábado/Domingo)
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Prazo Máximo para Envio
                            </label>
                            <input
                                type="datetime-local"
                                value={prazo}
                                onChange={(e) => setPrazo(e.target.value)}
                                className="input-field"
                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                                readOnly
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Engenheiro Responsável
                            </label>
                            <input
                                type="text"
                                value={responsavel}
                                onChange={(e) => setResponsavel(e.target.value)}
                                className="input-field"
                                placeholder="Nome do engenheiro"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--accent-red-light)' }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--accent-green-light)' }}>
                            <CheckCircle2 size={16} />
                            {success}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={() => router.push(`/obras-eng/${id}/programacao`)} className="btn-secondary" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                            {loading ? 'Criando...' : 'Criar Programação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function NovaProgramacaoPage() {
    return (
        <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center' }}>Carregando...</div>}>
            <NovaProgramacaoForm />
        </Suspense>
    )
}
