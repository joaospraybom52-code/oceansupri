'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export interface SearchSelectOption { value: string; label: string }

// Dropdown com campo de busca embutido (para listas longas, ex.: obras).
export default function SearchSelect({ options, value, onChange, placeholder = 'Selecionar...', minWidth }: {
    options: SearchSelectOption[]
    value: string
    onChange: (v: string) => void
    placeholder?: string
    minWidth?: number
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!open) return
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') } }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [open])
    const selLabel = options.find(o => o.value === value)?.label ?? ''
    const q = query.trim().toLowerCase()
    const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options
    const pick = (v: string) => { onChange(v); setOpen(false); setQuery('') }
    return (
        <div ref={ref} className="ss" style={{ minWidth }}>
            <button type="button" className="ss-box" onClick={() => setOpen(o => !o)}>
                <span className={value ? 'ss-val' : 'ss-ph'}>{value ? selLabel : placeholder}</span>
                <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
            </button>
            {open && (
                <div className="ss-menu">
                    <div className="ss-search">
                        <Search size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por código ou nome..." />
                    </div>
                    <div className="ss-list">
                        {filtered.length === 0 ? <div className="ss-empty">Nada encontrado</div> : filtered.map(o => (
                            <button type="button" key={o.value} className={`ss-opt${o.value === value ? ' sel' : ''}`} onClick={() => pick(o.value)}>{o.label}</button>
                        ))}
                    </div>
                </div>
            )}
            <style jsx>{`
                .ss { position: relative; }
                .ss-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: 8px; color: var(--text-primary); cursor: pointer; font-family: inherit; font-size: 14px; }
                .ss-val { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .ss-ph { color: var(--text-muted); }
                .ss-menu { position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; min-width: 100%; background: #14142b; border: 1px solid var(--border-glass); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); padding: 6px; }
                .ss-search { display: flex; align-items: center; gap: 8px; padding: 6px 9px; border: 1px solid var(--border-glass); border-radius: 6px; margin-bottom: 6px; }
                .ss-search input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-family: inherit; font-size: 13px; min-width: 0; }
                .ss-list { max-height: 280px; overflow-y: auto; }
                .ss-opt { display: block; width: 100%; text-align: left; padding: 8px 9px; border: none; background: none; border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: inherit; }
                .ss-opt:hover { background: rgba(255,255,255,0.06); }
                .ss-opt.sel { background: rgba(99,102,241,0.18); color: var(--text-primary); }
                .ss-empty { padding: 8px; color: var(--text-muted); font-size: 13px; }
            `}</style>
        </div>
    )
}
