'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Obra, Fornecedor } from '@/lib/types/database'
import { X, Plus, Package } from 'lucide-react'

interface NovoPedidoFormProps {
    onClose: () => void
    onCreated: () => void
}

export default function NovoPedidoForm({ onClose, onCreated }: NovoPedidoFormProps) {
    const [obras, setObras] = useState<Obra[]>([])
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        obra_id: '',
        codigo_uau: '',
        descricao_insumo: '',
        numero_pedido: '',
        solicitante_obra: '',
        emergencial: false,
    })
    const supabase = createClient()

    useEffect(() => {
        loadObras()
        loadDefaultComprador()
    }, [])

    async function loadDefaultComprador() {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email) {
            const { data: comprador } = await supabase
                .from('compradores')
                .select('nome')
                .eq('email', user.email)
                .single()

            // Apenas carregamos para garantir que o comprador existe se necessário, 
            // mas não preenchemos mais o campo Solicitante automaticamente.
        }
    }

    async function loadObras() {
        const { data } = await supabase.from('obras').select('*').eq('ativo', true).order('nome')
        if (data) setObras(data)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        let compradorId = null;
        if (user && user.email) {
            const { data: comprador } = await supabase
                .from('compradores')
                .select('id')
                .eq('email', user.email)
                .single()
            if (comprador) compradorId = comprador.id;
        }

        await supabase.from('pedidos_compra').insert({
            obra_id: form.obra_id,
            comprador_id: compradorId,
            codigo_uau: form.codigo_uau,
            descricao_insumo: form.descricao_insumo,
            numero_pedido: form.numero_pedido || null,
            solicitante_obra: form.solicitante_obra || null,
            emergencial: form.emergencial,
            status_fsm: 'requisitado',
            data_requisicao: new Date().toISOString(),
        })

        setLoading(false)
        onCreated()
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={20} style={{ color: 'var(--accent-blue)' }} />
                        Novo Pedido de Compra
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Obra *</label>
                        <select
                            value={form.obra_id}
                            onChange={(e) => setForm({ ...form, obra_id: e.target.value })}
                            className="select-field"
                            required
                        >
                            <option value="">Selecione a obra</option>
                            {obras.map(obra => (
                                <option key={obra.id} value={obra.id}>{obra.nome} ({obra.codigo})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Descrição do Insumo / Serviço *</label>
                        <input
                            type="text"
                            value={form.descricao_insumo}
                            onChange={(e) => setForm({ ...form, descricao_insumo: e.target.value })}
                            className="input-field"
                            placeholder="Ex: Aço CA-50 10mm, Concreto Usinado FCK30..."
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Código na Obra (Sistema UAU) *</label>
                            <input
                                type="text"
                                value={form.codigo_uau}
                                onChange={(e) => setForm({ ...form, codigo_uau: e.target.value })}
                                className="input-field"
                                placeholder="Obrigatório"
                                required
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Nº Pedido (Sistema UAU) *</label>
                            <input
                                type="text"
                                value={form.numero_pedido}
                                onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })}
                                className="input-field"
                                placeholder="Obrigatório"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Solicitante na Obra</label>
                        <input
                            type="text"
                            value={form.solicitante_obra}
                            onChange={(e) => setForm({ ...form, solicitante_obra: e.target.value })}
                            className="input-field"
                            placeholder="Nome do solicitante (Opcional)"
                        />
                    </div>

                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                        padding: '10px 12px', background: form.emergencial ? 'rgba(239,68,68,0.1)' : 'var(--bg-glass)',
                        border: `1px solid ${form.emergencial ? 'rgba(239,68,68,0.3)' : 'var(--border-glass)'}`,
                        borderRadius: 'var(--radius-sm)', transition: 'all 0.2s'
                    }}>
                        <input
                            type="checkbox"
                            checked={form.emergencial}
                            onChange={(e) => setForm({ ...form, emergencial: e.target.checked })}
                            style={{ accentColor: 'var(--accent-red)' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: form.emergencial ? 'var(--accent-red-light)' : 'var(--text-secondary)' }}>
                            ⚠️ Compra Emergencial (fora do planejamento)
                        </span>
                    </label>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} />
                            {loading ? 'Criando...' : 'Criar Pedido'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
