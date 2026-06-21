'use client'

import { useEffect } from 'react'

/**
 * Aplica em TODO o app, para qualquer <input type="date|datetime-local|time|...">:
 *  - bloqueia a digitação manual (o campo só pode ser preenchido pelo seletor);
 *  - abre o calendário ao clicar em qualquer parte do campo (não só no ícone).
 * Montado uma vez no layout raiz.
 */
const TIPOS_DATA = ['date', 'datetime-local', 'time', 'month', 'week']

export default function DatePickerGuard() {
    useEffect(() => {
        const ehCampoData = (el: EventTarget | null): el is HTMLInputElement =>
            el instanceof HTMLInputElement && TIPOS_DATA.includes(el.type)

        const onKeyDown = (e: KeyboardEvent) => {
            if (!ehCampoData(e.target)) return
            // Permite navegação (Tab) e atalhos do sistema/navegador; bloqueia o resto
            if (e.key === 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return
            e.preventDefault()
        }

        const onClick = (e: MouseEvent) => {
            if (!ehCampoData(e.target)) return
            try {
                e.target.showPicker?.()
            } catch {
                /* alguns navegadores podem recusar; ignora */
            }
        }

        document.addEventListener('keydown', onKeyDown, true)
        document.addEventListener('click', onClick, true)
        return () => {
            document.removeEventListener('keydown', onKeyDown, true)
            document.removeEventListener('click', onClick, true)
        }
    }, [])

    return null
}
