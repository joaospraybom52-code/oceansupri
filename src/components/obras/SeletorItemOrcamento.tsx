'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search } from 'lucide-react'

/**
 * Seletor do item do orçamento.
 *
 * Era um <select> nativo. Como a descrição do item vem do orçamento e às vezes
 * tem mais de 2.000 caracteres, o balão do select ficava maior que a tela e
 * aparecia cortado. Aqui a lista é desenhada por nós: largura do campo, altura
 * limitada, descrição em duas linhas e busca por código ou texto.
 */

type Item = { id: string, codigo?: string | null, descricao?: string | null }

const semAcento = (s: string | null | undefined) =>
    (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** A descrição pode vir com quebras de linha do orçamento; vira uma linha só. */
const limpa = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

export default function SeletorItemOrcamento({
    itens, value, onChange, placeholder = 'Selecione um item do orçamento *', disabled = false,
}: {
    itens: Item[]
    value: string
    onChange: (id: string) => void
    placeholder?: string
    disabled?: boolean
}) {
    const [aberto, setAberto] = useState(false)
    const [busca, setBusca] = useState('')
    const caixaRef = useRef<HTMLDivElement>(null)
    const buscaRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!aberto) return
        const fora = (e: MouseEvent) => {
            if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) setAberto(false)
        }
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
        document.addEventListener('mousedown', fora)
        document.addEventListener('keydown', tecla)
        buscaRef.current?.focus()
        return () => {
            document.removeEventListener('mousedown', fora)
            document.removeEventListener('keydown', tecla)
        }
    }, [aberto])

    const selecionado = itens.find(i => i.id === value)

    const filtrados = useMemo(() => {
        const termos = semAcento(busca).split(/\s+/).filter(Boolean)
        if (termos.length === 0) return itens
        return itens.filter(i => {
            const alvo = semAcento(`${i.codigo ?? ''} ${i.descricao ?? ''}`)
            return termos.every(t => alvo.includes(t))
        })
    }, [itens, busca])

    function escolher(id: string) {
        onChange(id)
        setAberto(false)
        setBusca('')
    }

    return (
        <div ref={caixaRef} style={{ position: 'relative' }}>
            <button
                type="button"
                onClick={() => !disabled && setAberto(a => !a)}
                disabled={disabled}
                title={selecionado ? `${selecionado.codigo} - ${limpa(selecionado.descricao)}` : undefined}
                className="select-field"
                style={{
                    display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
                }}
            >
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selecionado ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {selecionado ? `${selecionado.codigo} - ${limpa(selecionado.descricao)}` : placeholder}
                </span>
                <ChevronDown size={16} style={{ flexShrink: 0, color: 'var(--text-muted)', transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>

            {aberto && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)', boxShadow: '0 18px 40px rgba(0,0,0,0.45)', overflow: 'hidden',
                }}>
                    <div style={{ padding: '10px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                            ref={buscaRef} type="text" value={busca} onChange={e => setBusca(e.target.value)}
                            placeholder="Buscar por código ou descrição..."
                            style={{
                                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
                            }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {filtrados.length} {filtrados.length === 1 ? 'item' : 'itens'}
                        </span>
                    </div>

                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {filtrados.length === 0 && (
                            <div style={{ padding: '18px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                                Nenhum item do orçamento com esse texto.
                            </div>
                        )}
                        {filtrados.map(item => {
                            const ativo = item.id === value
                            return (
                                <button
                                    key={item.id} type="button" onClick={() => escolher(item.id)}
                                    title={limpa(item.descricao)}
                                    style={{
                                        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                                        padding: '9px 12px', border: 'none', borderBottom: '1px solid var(--border-glass)',
                                        background: ativo ? 'rgba(99,102,241,0.18)' : 'transparent',
                                        color: 'var(--text-primary)', fontFamily: 'inherit',
                                    }}
                                    onMouseEnter={e => { if (!ativo) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                    onMouseLeave={e => { if (!ativo) e.currentTarget.style.background = 'transparent' }}
                                >
                                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                                        {item.codigo}
                                    </span>
                                    <span style={{
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4,
                                    }}>
                                        {limpa(item.descricao)}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
