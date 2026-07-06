'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface MultiSelectOption { value: string; label: string }

// Dropdown de seleção múltipla com checkboxes (padrão da aba KPI'S).
export default function MultiSelect({ options, selected, onChange, placeholder, minWidth }: {
    options: MultiSelectOption[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string; minWidth?: number
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!open) return
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [open])
    const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
    const display = selected.length === 0 ? placeholder : options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')
    return (
        <div ref={ref} className="dd" style={{ minWidth }}>
            <button type="button" className="dd-box" onClick={() => setOpen(o => !o)}>
                <span className={selected.length ? 'dd-val' : 'dd-ph'}>{display}</span>
                <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
            </button>
            {open && (
                <div className="dd-menu">
                    {options.length === 0 ? <div className="dd-empty">Sem opções</div> : options.map(o => (
                        <label key={o.value} className="dd-opt">
                            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
                            <span>{o.label}</span>
                        </label>
                    ))}
                    {selected.length > 0 && <button type="button" className="dd-clear" onClick={() => onChange([])}>Limpar seleção</button>}
                </div>
            )}
            <style jsx>{`
                .dd { position: relative; }
                .dd-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: 8px; color: var(--text-primary); cursor: pointer; font-family: inherit; font-size: 14px; }
                .dd-val { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
                .dd-ph { color: var(--text-muted); }
                .dd-menu { position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; min-width: 100%; background: #14142b; border: 1px solid var(--border-glass); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); padding: 6px; max-height: 300px; overflow-y: auto; }
                .dd-opt { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
                .dd-opt:hover { background: rgba(255,255,255,0.06); }
                .dd-opt input { accent-color: #6366f1; cursor: pointer; width: 15px; height: 15px; }
                .dd-clear { margin-top: 4px; width: 100%; padding: 7px; background: none; border: none; border-top: 1px solid var(--border-glass); color: var(--text-muted); cursor: pointer; font-size: 12px; }
                .dd-clear:hover { color: var(--text-primary); }
                .dd-empty { padding: 8px; color: var(--text-muted); font-size: 13px; }
            `}</style>
        </div>
    )
}
