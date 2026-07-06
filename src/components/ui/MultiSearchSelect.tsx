'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export interface MultiSearchSelectOption { value: string; label: string }

// Seleção múltipla com campo de busca (para listas longas, ex.: obras).
export default function MultiSearchSelect({ options, selected, onChange, placeholder, minWidth }: {
    options: MultiSearchSelectOption[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string; minWidth?: number
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
    const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
    const q = query.trim().toLowerCase()
    const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options
    const display = selected.length === 0
        ? placeholder
        : options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')
    return (
        <div ref={ref} className="mss" style={{ minWidth }}>
            <button type="button" className="mss-box" onClick={() => setOpen(o => !o)}>
                <span className={selected.length ? 'mss-val' : 'mss-ph'}>{display}</span>
                <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
            </button>
            {open && (
                <div className="mss-menu">
                    <div className="mss-search">
                        <Search size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por código ou nome..." />
                    </div>
                    <div className="mss-list">
                        {filtered.length === 0 ? <div className="mss-empty">Nada encontrado</div> : filtered.map(o => (
                            <label key={o.value} className="mss-opt">
                                <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
                                <span>{o.label}</span>
                            </label>
                        ))}
                    </div>
                    {selected.length > 0 && <button type="button" className="mss-clear" onClick={() => onChange([])}>Limpar seleção</button>}
                </div>
            )}
            <style jsx>{`
                .mss { position: relative; }
                .mss-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: 8px; color: var(--text-primary); cursor: pointer; font-family: inherit; font-size: 14px; }
                .mss-val { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px; }
                .mss-ph { color: var(--text-muted); }
                .mss-menu { position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; min-width: 100%; background: #14142b; border: 1px solid var(--border-glass); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); padding: 6px; }
                .mss-search { display: flex; align-items: center; gap: 8px; padding: 6px 9px; border: 1px solid var(--border-glass); border-radius: 6px; margin-bottom: 6px; }
                .mss-search input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-family: inherit; font-size: 13px; min-width: 0; }
                .mss-list { max-height: 260px; overflow-y: auto; }
                .mss-opt { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
                .mss-opt:hover { background: rgba(255,255,255,0.06); }
                .mss-opt input { accent-color: #6366f1; cursor: pointer; width: 15px; height: 15px; flex-shrink: 0; }
                .mss-clear { margin-top: 4px; width: 100%; padding: 7px; background: none; border: none; border-top: 1px solid var(--border-glass); color: var(--text-muted); cursor: pointer; font-size: 12px; }
                .mss-clear:hover { color: var(--text-primary); }
                .mss-empty { padding: 8px; color: var(--text-muted); font-size: 13px; }
            `}</style>
        </div>
    )
}
