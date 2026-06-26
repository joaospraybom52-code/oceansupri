'use client'

import { useMemo, useState } from 'react'
import { Plus, X, Pencil, Trash2, Receipt, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Venda {
    id: string
    codigo_obra: string | null
    ano: number | null
    nome_obra: string | null
    cliente: string | null
    valor_venda: number | null
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const lbl: React.CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }
const iconBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '6px',
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0,
}

const formVazio = { codigo_obra: '', ano: String(new Date().getFullYear()), nome_obra: '', cliente: '', valor_venda: '' }

export default function CadastroVendaClient({ vendasIniciais, podeEditar }: { vendasIniciais: Venda[]; podeEditar: boolean }) {
    const supabase = createClient()
    const [vendas, setVendas] = useState<Venda[]>(vendasIniciais)
    const [busca, setBusca] = useState('')

    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState(formVazio)

    function abrirCadastro() {
        setEditId(null)
        setForm(formVazio)
        setShowModal(true)
    }

    function abrirEdicao(v: Venda) {
        setEditId(v.id)
        setForm({
            codigo_obra: v.codigo_obra ?? '',
            ano: v.ano != null ? String(v.ano) : '',
            nome_obra: v.nome_obra ?? '',
            cliente: v.cliente ?? '',
            valor_venda: v.valor_venda != null ? String(v.valor_venda) : '',
        })
        setShowModal(true)
    }

    function fechar() {
        setShowModal(false); setEditId(null); setForm(formVazio)
    }

    async function handleExcluir(v: Venda) {
        if (!window.confirm(`Excluir a venda ${v.codigo_obra ?? ''} (${formatCurrency(Number(v.valor_venda))})?`)) return
        const { error } = await supabase.from('controle_vgv').delete().eq('id', v.id)
        if (error) toast.error('Erro ao excluir: ' + error.message)
        else { setVendas(vendas.filter(x => x.id !== v.id)); toast.success('Venda excluída!') }
    }

    async function handleSalvar(e: React.FormEvent) {
        e.preventDefault()
        if (!form.codigo_obra || !form.valor_venda) { toast.error('Preencha ao menos o código da obra e o valor de venda.'); return }
        setLoading(true)
        const payload = {
            codigo_obra: form.codigo_obra.trim().toUpperCase(),
            ano: form.ano ? parseInt(form.ano) : null,
            nome_obra: form.nome_obra || null,
            cliente: form.cliente || null,
            valor_venda: Number(form.valor_venda),
        }
        const sel = 'id, codigo_obra, ano, nome_obra, cliente, valor_venda'
        if (editId) {
            const { data, error } = await supabase.from('controle_vgv').update(payload).eq('id', editId).select(sel).single()
            if (error) toast.error('Erro ao salvar: ' + error.message)
            else { setVendas(vendas.map(v => v.id === editId ? (data as Venda) : v)); toast.success('Venda atualizada!'); fechar() }
        } else {
            const { data, error } = await supabase.from('controle_vgv').insert(payload).select(sel).single()
            if (error) toast.error('Erro ao salvar: ' + error.message)
            else { setVendas([...vendas, data as Venda]); toast.success('Venda cadastrada!'); fechar() }
        }
        setLoading(false)
    }

    const vendasFiltradas = useMemo(() => {
        const q = busca.trim().toLowerCase()
        if (!q) return vendas
        return vendas.filter(v =>
            (v.codigo_obra ?? '').toLowerCase().includes(q) ||
            (v.nome_obra ?? '').toLowerCase().includes(q) ||
            (v.cliente ?? '').toLowerCase().includes(q),
        )
    }, [vendas, busca])

    const totalVgv = useMemo(() => vendasFiltradas.reduce((s, v) => s + Number(v.valor_venda || 0), 0), [vendasFiltradas])

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Cadastro de venda</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>VGV — Valor Geral de Vendas por obra</p>
                </div>
                {podeEditar && (
                    <button onClick={abrirCadastro} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Cadastrar venda
                    </button>
                )}
            </div>

            {/* Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#10b9811a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Receipt size={22} color="#10b981" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>VGV total {busca && '(filtro)'}</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{formatCurrency(totalVgv)}</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Vendas cadastradas</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{vendasFiltradas.length}</div>
                    </div>
                </div>
            </div>

            {/* Busca + Tabela */}
            <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', maxWidth: '360px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input value={busca} onChange={e => setBusca(e.target.value)} className="input-field" placeholder="Buscar por obra, nome ou cliente..." style={{ paddingLeft: '36px', width: '100%' }} />
                    </div>
                </div>

                {vendasFiltradas.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '12px 0' }}>Nenhuma venda cadastrada.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                                    <th style={{ padding: '8px 10px' }}>Código</th>
                                    <th style={{ padding: '8px 10px' }}>Ano</th>
                                    <th style={{ padding: '8px 10px' }}>Nome da obra</th>
                                    <th style={{ padding: '8px 10px' }}>Cliente</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Valor de venda</th>
                                    {podeEditar && <th style={{ padding: '8px 10px', textAlign: 'right' }}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {vendasFiltradas.map(v => (
                                    <tr key={v.id} style={{ borderTop: '1px solid var(--border-glass)' }}>
                                        <td style={{ padding: '10px', fontWeight: 700 }}>{v.codigo_obra}</td>
                                        <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{v.ano ?? '—'}</td>
                                        <td style={{ padding: '10px' }}>{v.nome_obra ?? '—'}</td>
                                        <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{v.cliente ?? '—'}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-green)', whiteSpace: 'nowrap' }}>{formatCurrency(Number(v.valor_venda))}</td>
                                        {podeEditar && (
                                            <td style={{ padding: '10px' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => abrirEdicao(v)} title="Editar" style={iconBtnStyle}><Pencil size={14} /></button>
                                                    <button onClick={() => handleExcluir(v)} title="Excluir" style={{ ...iconBtnStyle, color: 'var(--accent-red, #ef4444)' }}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--border-glass)' }}>
                                    <td colSpan={4} style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total {busca && '(filtro)'}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-green)' }}>{formatCurrency(totalVgv)}</td>
                                    {podeEditar && <td />}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Cadastro/Edição */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{editId ? 'Editar venda' : 'Cadastrar venda'}</h3>
                            <button onClick={fechar} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label style={lbl}>Código da obra *</label><input value={form.codigo_obra} onChange={e => setForm({ ...form, codigo_obra: e.target.value })} className="input-field" placeholder="Ex: NES01" required /></div>
                                <div><label style={lbl}>Ano</label><input type="number" value={form.ano} onChange={e => setForm({ ...form, ano: e.target.value })} className="input-field" placeholder="2025" /></div>
                            </div>
                            <div><label style={lbl}>Nome da obra</label><input value={form.nome_obra} onChange={e => setForm({ ...form, nome_obra: e.target.value })} className="input-field" placeholder="Descrição da obra" /></div>
                            <div><label style={lbl}>Cliente</label><input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className="input-field" placeholder="Nome do cliente" /></div>
                            <div><label style={lbl}>Valor de venda *</label><input type="number" step="0.01" min="0" value={form.valor_venda} onChange={e => setForm({ ...form, valor_venda: e.target.value })} className="input-field" placeholder="0,00" required /></div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button type="button" onClick={fechar} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
