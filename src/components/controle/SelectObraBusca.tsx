'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export interface ObraOpcao {
    id: string
    codigo: string | null
    nome: string
}

/**
 * Seletor de obra COM BUSCA.
 *
 * A lista já passa de 50 obras e o <select> nativo só acha pela primeira letra
 * digitada, então achar "NES29 - Paisagismo" virou rolagem. Aqui dá para digitar
 * tanto o código ("nes29") quanto um pedaço do nome ("paisagismo"), em qualquer
 * ordem e sem acento.
 */
const semAcento = (v: string) =>
    (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const rotuloDe = (o: ObraOpcao) => `${o.codigo ? `${o.codigo} - ` : ''}${o.nome}`

export default function SelectObraBusca({
    obras, value, onChange, placeholder = 'Selecione a obra', id,
}: {
    obras: ObraOpcao[]
    value: string
    onChange: (id: string) => void
    placeholder?: string
    id?: string
}) {
    const [aberto, setAberto] = useState(false)
    const [busca, setBusca] = useState('')
    const [destaque, setDestaque] = useState(0)
    const caixa = useRef<HTMLDivElement>(null)
    const campo = useRef<HTMLInputElement>(null)
    const lista = useRef<HTMLDivElement>(null)

    const selecionada = obras.find(o => o.id === value) || null

    const filtradas = useMemo(() => {
        const termos = semAcento(busca).split(/\s+/).filter(Boolean)
        if (termos.length === 0) return obras
        return obras.filter(o => {
            const alvo = semAcento(rotuloDe(o))
            return termos.every(t => alvo.includes(t))
        })
    }, [obras, busca])

    // Fecha ao clicar fora.
    useEffect(() => {
        if (!aberto) return
        const fora = (e: MouseEvent) => {
            if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false)
        }
        document.addEventListener('mousedown', fora)
        return () => document.removeEventListener('mousedown', fora)
    }, [aberto])

    // Abrir limpa a busca, destaca a obra já escolhida e leva o cursor para o
    // campo de busca (o reset fica aqui, e não num efeito, para não disparar
    // renderização em cascata).
    const abrir = () => {
        setBusca('')
        setDestaque(Math.max(0, obras.findIndex(o => o.id === value)))
        setAberto(true)   // o foco vai para a busca pelo autoFocus do input
    }

    // Mantém a linha destacada visível enquanto navega pelo teclado.
    useEffect(() => {
        if (!aberto) return
        lista.current?.querySelector<HTMLElement>(`[data-i="${destaque}"]`)
            ?.scrollIntoView({ block: 'nearest' })
    }, [destaque, aberto])

    const escolher = (o: ObraOpcao) => { onChange(o.id); setAberto(false) }

    const teclado = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (filtradas.length === 0) return
            setDestaque(d => {
                const n = e.key === 'ArrowDown' ? d + 1 : d - 1
                return (n + filtradas.length) % filtradas.length
            })
        } else if (e.key === 'Enter') {
            e.preventDefault()   // não envia o formulário sem querer
            const o = filtradas[destaque]
            if (o) escolher(o)
        } else if (e.key === 'Escape') {
            e.preventDefault()
            setAberto(false)
        }
    }

    const campoStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
        textAlign: 'left', justifyContent: 'space-between',
    }

    return (
        <div ref={caixa} style={{ position: 'relative' }}>
            <button
                type="button" id={id} className="select-field" style={campoStyle}
                onClick={() => (aberto ? setAberto(false) : abrir())}
                aria-haspopup="listbox" aria-expanded={aberto}
            >
                <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: selecionada ? 'var(--text-primary)' : 'var(--text-muted)',
                }}>
                    {selecionada ? rotuloDe(selecionada) : placeholder}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {selecionada && (
                        <X
                            size={15} color="var(--text-muted)"
                            onClick={e => { e.stopPropagation(); onChange(''); setAberto(false) }}
                            aria-label="Limpar obra"
                        />
                    )}
                    <ChevronDown size={16} color="var(--text-muted)" style={{
                        transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
                    }} />
                </span>
            </button>

            {aberto && (
                <div style={{
                    position: 'absolute', zIndex: 50, top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                        borderBottom: '1px solid var(--border-glass)',
                    }}>
                        <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        <input
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            ref={campo} value={busca} onChange={e => { setBusca(e.target.value); setDestaque(0) }}
                            onKeyDown={teclado} placeholder="Buscar por código ou nome..."
                            style={{
                                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
                            }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {filtradas.length}
                        </span>
                    </div>

                    <div ref={lista} role="listbox" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                        {filtradas.length === 0 ? (
                            <div style={{ padding: '14px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                Nenhuma obra encontrada
                            </div>
                        ) : filtradas.map((o, i) => {
                            const ativa = i === destaque
                            const escolhida = o.id === value
                            return (
                                <div
                                    key={o.id} data-i={i} role="option" aria-selected={escolhida}
                                    onMouseEnter={() => setDestaque(i)}
                                    onClick={() => escolher(o)}
                                    style={{
                                        padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'baseline', gap: '8px',
                                        background: ativa ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                                        color: 'var(--text-primary)',
                                        borderLeft: `2px solid ${escolhida ? 'var(--accent-blue)' : 'transparent'}`,
                                    }}
                                >
                                    <strong style={{
                                        fontSize: '12px', fontWeight: 700, minWidth: '46px', flexShrink: 0,
                                        color: escolhida ? 'var(--accent-blue-light)' : 'var(--text-secondary)',
                                    }}>
                                        {o.codigo || '—'}
                                    </strong>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {o.nome}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
