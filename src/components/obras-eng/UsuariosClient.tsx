'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, RotateCcw, KeyRound, Search, Users, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PERFIS, perfilPorId, resumoPerfil } from '@/lib/utils/perfis-acesso'
import { criarUsuario, alterarPerfil, desativarUsuario, reativarUsuario, redefinirSenha } from '@/app/obras-eng/usuarios/actions'

export interface UsuarioRow {
    id: string
    nome: string
    email: string
    perfil: string
    ativo: boolean
    observacoes: string | null
    criado_por: string | null
    criado_em: string | null
    desativado_por: string | null
    desativado_em: string | null
}

const lbl: React.CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }
const iconBtn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '6px',
    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0,
}
const formVazio = { nome: '', email: '', senha: '', perfil: 'engenharia', observacoes: '' }
const dmy = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'

export default function UsuariosClient({ usuariosIniciais, meuEmail }: { usuariosIniciais: UsuarioRow[]; meuEmail: string }) {
    const router = useRouter()
    const [busca, setBusca] = useState('')
    const [mostrarInativos, setMostrarInativos] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState(formVazio)
    const [pendente, startTransition] = useTransition()

    const usuarios = usuariosIniciais
    const ativos = usuarios.filter(u => u.ativo).length

    const filtrados = useMemo(() => {
        const q = busca.trim().toLowerCase()
        return usuarios
            .filter(u => mostrarInativos || u.ativo)
            .filter(u => !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }, [usuarios, busca, mostrarInativos])

    /** Toda ação do servidor passa por aqui: mostra o retorno e recarrega a lista. */
    function executar(fn: () => Promise<{ ok: true; msg: string } | { ok: false; erro: string }>, aoDarCerto?: () => void) {
        startTransition(async () => {
            const r = await fn()
            if (r.ok) { toast.success(r.msg); aoDarCerto?.(); router.refresh() }
            else toast.error(r.erro)
        })
    }

    return (
        <div style={{ padding: '28px 32px', maxWidth: '1200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '6px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={22} color="#10b981" /> Cadastro de usuários
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                        {ativos} usuário{ativos === 1 ? '' : 's'} ativo{ativos === 1 ? '' : 's'} · aba restrita ao administrador
                    </p>
                </div>
                <button onClick={() => { setForm(formVazio); setShowModal(true) }} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <Plus size={16} /> Novo usuário
                </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '18px 0 14px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input value={busca} onChange={e => setBusca(e.target.value)} className="input-field" placeholder="Buscar por nome ou e-mail..." style={{ paddingLeft: '34px', width: '100%' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} />
                    Mostrar desativados
                </label>
            </div>

            <div className="glass-card" style={{ padding: '6px 12px 12px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                            <th style={{ padding: '10px' }}>Usuário</th>
                            <th style={{ padding: '10px', width: '260px' }}>Nível de acesso</th>
                            <th style={{ padding: '10px', width: '150px' }}>Situação</th>
                            <th style={{ padding: '10px', width: '120px', textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtrados.length === 0 && (
                            <tr><td colSpan={4} style={{ padding: '20px 10px', color: 'var(--text-muted)' }}>Nenhum usuário encontrado.</td></tr>
                        )}
                        {filtrados.map(u => {
                            const perfil = perfilPorId(u.perfil)
                            const souEu = u.email === meuEmail
                            return (
                                <tr key={u.id} style={{ borderTop: '1px solid var(--border-glass)', opacity: u.ativo ? 1 : 0.55 }}>
                                    <td style={{ padding: '10px' }}>
                                        <div style={{ fontWeight: 600 }}>{u.nome}{souEu && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (você)</span>}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{u.email}</div>
                                        {u.observacoes && <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{u.observacoes}</div>}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <select
                                            value={u.perfil}
                                            disabled={pendente || souEu}
                                            onChange={e => executar(() => alterarPerfil(u.id, e.target.value))}
                                            className="input-field"
                                            style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px' }}
                                        >
                                            {PERFIS.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                        </select>
                                        {perfil && <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>{resumoPerfil(perfil)}</div>}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {u.ativo ? (
                                            <span style={{ color: 'var(--accent-green, #10b981)', fontWeight: 600 }}>Ativo</span>
                                        ) : (
                                            <div>
                                                <span style={{ color: 'var(--accent-red, #ef4444)', fontWeight: 600 }}>Desativado</span>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>em {dmy(u.desativado_em)}</div>
                                            </div>
                                        )}
                                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>cadastrado em {dmy(u.criado_em)}</div>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                            <button
                                                title="Trocar senha" style={iconBtn} disabled={pendente || !u.ativo}
                                                onClick={() => {
                                                    const senha = window.prompt(`Nova senha para ${u.nome} (mínimo 6 caracteres):`)
                                                    if (senha) executar(() => redefinirSenha(u.id, senha))
                                                }}
                                            ><KeyRound size={14} /></button>
                                            {u.ativo ? (
                                                <button
                                                    title={souEu ? 'Você não pode desativar o seu próprio acesso' : 'Desativar acesso'}
                                                    style={{ ...iconBtn, color: 'var(--accent-red, #ef4444)' }} disabled={pendente || souEu}
                                                    onClick={() => {
                                                        if (window.confirm(`Desativar ${u.nome}?\n\nO login será bloqueado e as permissões retiradas. Tudo o que a pessoa fez continua gravado, e dá para reativar depois.`)) {
                                                            executar(() => desativarUsuario(u.id))
                                                        }
                                                    }}
                                                ><Trash2 size={14} /></button>
                                            ) : (
                                                <button
                                                    title="Reativar acesso" style={iconBtn} disabled={pendente}
                                                    onClick={() => executar(() => reativarUsuario(u.id))}
                                                ><RotateCcw size={14} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px', marginTop: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <ShieldCheck size={16} color="#10b981" />
                    <strong style={{ fontSize: '13px' }}>O que cada nível libera</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
                    {PERFIS.map(p => (
                        <div key={p.id} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{p.nome}</strong> — {p.descricao}
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '470px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Novo usuário</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form
                            onSubmit={e => {
                                e.preventDefault()
                                executar(() => criarUsuario(form), () => { setShowModal(false); setForm(formVazio) })
                            }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                        >
                            <div><label style={lbl}>Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input-field" placeholder="Nome da pessoa" required /></div>
                            <div><label style={lbl}>E-mail *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="nome@constrowins.eng.br" required /></div>
                            <div>
                                <label style={lbl}>Senha *</label>
                                <input type="text" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} className="input-field" placeholder="mínimo 6 caracteres" minLength={6} required />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>A pessoa entra com essa senha. Depois você pode trocá-la pelo botão da chave.</span>
                            </div>
                            <div>
                                <label style={lbl}>Nível de acesso *</label>
                                <select value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value })} className="input-field" style={{ width: '100%' }}>
                                    {PERFIS.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '5px', lineHeight: 1.4 }}>
                                    {perfilPorId(form.perfil)?.descricao}
                                </span>
                            </div>
                            <div><label style={lbl}>Observações</label><input value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="input-field" placeholder="Cargo, setor, quem pediu o acesso..." /></div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={pendente}>{pendente ? 'Salvando...' : 'Cadastrar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
