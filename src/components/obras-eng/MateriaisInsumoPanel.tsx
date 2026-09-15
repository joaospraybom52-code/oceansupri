'use client'

import { X, Package } from 'lucide-react'

export interface MaterialInsumo {
    obra_plt: string
    item_plt: string | null
    ins_cins: string | null
    material: string | null
    valor: number | null
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

/**
 * Materiais (desembolso) que compõem o custo de um insumo. Usado no
 * Acompanhamento de Custo e na aba Obras diretoria — mesma fonte
 * (custo_materiais) e mesmo visual nos dois lugares.
 */
export default function MateriaisInsumoPanel({
    item, descricao, materiais, onClose,
}: {
    item: string
    descricao: string
    materiais: MaterialInsumo[]
    onClose: () => void
}) {
    const total = materiais.reduce((s, m) => s + Number(m.valor || 0), 0)

    return (
        <div className="glass-card" style={{ padding: '20px', flex: '1 1 40%', minWidth: 0, maxHeight: '72vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Package size={18} color="#10b981" />
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Materiais do insumo</h3>
                </div>
                <button onClick={onClose} title="Fechar" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>{item} · {descricao}</p>
            {materiais.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem materiais lançados para este insumo.</p>
            ) : (
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {materiais.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: 0 }}>{m.material}</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(Number(m.valor || 0))}</span>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', marginTop: '8px', paddingTop: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Total ({materiais.length})</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-green)' }}>{fmt(total)}</span>
            </div>
        </div>
    )
}
