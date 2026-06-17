'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, HardHat, Hash, MapPin } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function EditarObraClient({ obra }: { obra: any }) {
    const router = useRouter()
    const supabase = createClient()
    const [nome, setNome] = useState(obra.nome)
    const [codigoUau, setCodigoUau] = useState(obra.codigo_uau || '')
    const [local, setLocal] = useState(obra.local || '')
    const [status, setStatus] = useState(obra.status || 'em_andamento')
    const [previsaoInicio, setPrevisaoInicio] = useState(obra.previsao_inicio || '')
    const [previsaoTermino, setPrevisaoTermino] = useState(obra.previsao_termino || '')
    const [loading, setLoading] = useState(false)

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!nome) {
            toast.error('O nome da obra é obrigatório.')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('obras_eng')
                .update({
                    nome,
                    codigo_uau: codigoUau || null,
                    local: local || null,
                    previsao_inicio: previsaoInicio || null,
                    previsao_termino: previsaoTermino || null,
                    status
                })
                .eq('id', obra.id)

            if (error) throw error

            toast.success('Informações da obra atualizadas com sucesso!')
            router.push('/obras-eng')
            router.refresh()
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <Link href="/obras-eng" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
                <ArrowLeft size={16} /> Voltar para Obras
            </Link>
            
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Editar Informações da Obra</h2>

            <div className="glass-card" style={{ padding: '32px' }}>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Nome */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Nome da Obra *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <HardHat size={18} />
                            </div>
                            <input
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                required
                            />
                        </div>
                    </div>

                    {/* Código UAU & Local */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Código UAU
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                    <Hash size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={codigoUau}
                                    onChange={(e) => setCodigoUau(e.target.value)}
                                    className="input-field"
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="Ex: 001"
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Local
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                    <MapPin size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={local}
                                    onChange={(e) => setLocal(e.target.value)}
                                    className="input-field"
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="Ex: São Paulo - SP"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Previsão de Início e Término */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Previsão de Início
                            </label>
                            <input
                                type="date"
                                value={previsaoInicio}
                                onChange={(e) => setPrevisaoInicio(e.target.value)}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Previsão de Término
                            </label>
                            <input
                                type="date"
                                value={previsaoTermino}
                                onChange={(e) => setPrevisaoTermino(e.target.value)}
                                className="input-field"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Status da Obra
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="select-field"
                        >
                            <option value="em_andamento">Em Andamento</option>
                            <option value="planejamento">Planejamento</option>
                            <option value="concluida">Concluída</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                        <button type="button" onClick={() => router.push('/obras-eng')} className="btn-secondary" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px', justifyContent: 'center' }}>
                            <Save size={16} />
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
