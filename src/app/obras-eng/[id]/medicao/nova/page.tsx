'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NovaMedicaoPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const supabase = createClient()
    const [inicio, setInicio] = useState('')
    const [fim, setFim] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (!inicio || !fim) {
            setError('Preencha os períodos de início e fim.')
            setLoading(false)
            return
        }

        try {
            const { data, error } = await supabase
                .from('medicoes')
                .insert({
                    obra_id: params.id,
                    periodo_inicio: inicio,
                    periodo_fim: fim,
                    status: 'Rascunho'
                })
                .select('id')
                .single()

            if (error) throw error

            router.push(`/obras-eng/${params.id}/medicao/${data.id}`)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <Link href={`/obras-eng/${params.id}/medicao`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
                <ArrowLeft size={16} /> Voltar
            </Link>
            
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px' }}>Criar Nova Medição</h2>

            <div className="glass-card" style={{ padding: '32px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--accent-red-light)' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                        <button type="button" onClick={() => router.push(`/obras-eng/${params.id}/medicao`)} className="btn-secondary" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                            {loading ? 'Criando...' : 'Salvar e Continuar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
