'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Fornecedor } from '@/lib/types/database'
import { Truck, Plus, X, Check, Phone, Mail, Edit2 } from 'lucide-react'

export default function FornecedoresPage() {
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState({ razao_social: '', cnpj: '', contato: '', email: '', telefone: '' })
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => { loadFornecedores() }, [])

    async function loadFornecedores() {
        const { data } = await supabase.from('fornecedores').select('*').order('razao_social')
        if (data) setFornecedores(data)
        setLoading(false)
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        await supabase.from('fornecedores').insert(form)
        setForm({ razao_social: '', cnpj: '', contato: '', email: '', telefone: '' })
        setShowForm(false)
        loadFornecedores()
    }

    async function handleUpdate(id: string) {
        await supabase.from('fornecedores').update(form).eq('id', id)
        setEditingId(null)
        setForm({ razao_social: '', cnpj: '', contato: '', email: '', telefone: '' })
        setShowForm(false)
        loadFornecedores()
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Fornecedores</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{fornecedores.length} fornecedores cadastrados</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} /> Novo Fornecedor
                </button>
            </div>

            {showForm && (
                <div className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
                    <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(editingId) } : handleCreate} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Razão Social *</label>
                            <input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} className="input-field" required placeholder="Empresa LTDA" />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CNPJ</label>
                            <input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="input-field" placeholder="00.000.000/0001-00" />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contato</label>
                            <input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} className="input-field" placeholder="Nome" />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email</label>
                            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="email@empresa.com" />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Telefone</label>
                            <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="input-field" placeholder="(00) 0000-0000" />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }} title={editingId ? "Salvar Edição" : "Salvar"}><Check size={16} /></button>
                            <button type="button" onClick={() => {
                                setShowForm(false)
                                setEditingId(null)
                                setForm({ razao_social: '', cnpj: '', contato: '', email: '', telefone: '' })
                            }} className="btn-secondary" style={{ padding: '10px 16px' }}><X size={16} /></button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                {fornecedores.map(f => (
                    <div key={f.id} className="glass-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Truck size={20} style={{ color: 'var(--accent-amber)' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.razao_social}</h3>
                                    {f.cnpj && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.cnpj}</p>}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setForm({
                                        razao_social: f.razao_social,
                                        cnpj: f.cnpj || '',
                                        contato: f.contato || '',
                                        email: f.email || '',
                                        telefone: f.telefone || ''
                                    })
                                    setEditingId(f.id)
                                    setShowForm(true)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                                    padding: '4px'
                                }}
                                title="Editar Fornecedor"
                            >
                                <Edit2 size={16} />
                            </button>
                        </div>
                        {(f.contato || f.email || f.telefone) && (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {f.contato && <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{f.contato}</p>}
                                {f.email && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={10} /> {f.email}</p>}
                                {f.telefone && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={10} /> {f.telefone}</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
