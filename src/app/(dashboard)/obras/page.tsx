'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Obra } from '@/lib/types/database'
import { Building2, Plus, X, Edit2, Check, MapPin } from 'lucide-react'

export default function ObrasPage() {
    const [obras, setObras] = useState<Obra[]>([])
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState({ nome: '', codigo: '', endereco: '', engenheiro_responsavel: '' })
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => { loadObras() }, [])

    async function loadObras() {
        const { data } = await supabase.from('obras').select('*').order('nome')
        if (data) setObras(data)
        setLoading(false)
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        await supabase.from('obras').insert({ ...form, ativo: true })
        setForm({ nome: '', codigo: '', endereco: '', engenheiro_responsavel: '' })
        setShowForm(false)
        loadObras()
    }

    async function handleUpdate(id: string) {
        await supabase.from('obras').update(form).eq('id', id)
        setEditingId(null)
        loadObras()
    }

    async function toggleAtivo(id: string, ativo: boolean | null) {
        await supabase.from('obras').update({ ativo: !ativo }).eq('id', id)
        loadObras()
    }

    const filteredObras = obras.filter(obra =>
        obra.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (obra.codigo && obra.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Obras</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filteredObras.length} obras encontradas</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Buscar por nome ou código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field"
                            style={{ width: '250px', paddingLeft: '32px' }}
                        />
                        <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                            <Building2 size={14} />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={16} /> Nova Obra
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
                    <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nome da Obra *</label>
                            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input-field" required placeholder="Residencial Solar" />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Código</label>
                            <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="input-field" placeholder="OBR-001" />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Endereço</label>
                            <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="input-field" placeholder="Rua..." />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Engenheiro</label>
                            <input value={form.engenheiro_responsavel} onChange={(e) => setForm({ ...form, engenheiro_responsavel: e.target.value })} className="input-field" placeholder="Nome" />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }}><Check size={16} /></button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ padding: '10px 16px' }}><X size={16} /></button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                {filteredObras.map(obra => (
                    <div key={obra.id} className="glass-card" style={{ padding: '16px', opacity: obra.ativo ? 1 : 0.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Building2 size={20} style={{ color: 'var(--accent-blue)' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '14px', fontWeight: 700 }}>{obra.nome}</h3>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{obra.codigo}</p>
                                </div>
                            </div>
                            <span className="badge" style={{ background: obra.ativo ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: obra.ativo ? 'var(--accent-green)' : 'var(--accent-red)', cursor: 'pointer' }}
                                onClick={() => toggleAtivo(obra.id, obra.ativo)}>
                                {obra.ativo ? 'Ativa' : 'Inativa'}
                            </span>
                        </div>
                        {(obra.endereco || obra.engenheiro_responsavel) && (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
                                {obra.endereco && (
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={10} /> {obra.endereco}
                                    </p>
                                )}
                                {obra.engenheiro_responsavel && (
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Eng: {obra.engenheiro_responsavel}</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
