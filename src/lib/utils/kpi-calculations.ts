import { StatusFSM } from '@/lib/types/database'

export const STATUS_LABELS: Record<StatusFSM, string> = {
    requisitado: 'Requisitado',
    em_cotacao: 'Em Cotação',
    aguardando_aprovacao: 'Aguard. Aprovação',
    aprovado: 'Aprovado',
    ordem_gerada: 'Ordem Gerada',
    em_transito: 'Em Trânsito',
    aguardando_entrega: 'Aguard. Entrega',
    entregue: 'Entregue',
}

export const STATUS_COLORS: Record<StatusFSM, string> = {
    requisitado: '#6366f1',
    em_cotacao: '#f59e0b',
    aguardando_aprovacao: '#ef4444',
    aprovado: '#10b981',
    ordem_gerada: '#3b82f6',
    em_transito: '#f97316',
    aguardando_entrega: '#8b5cf6',
    entregue: '#059669',
}

export const KANBAN_COLUMNS: StatusFSM[] = [
    'requisitado',
    'em_cotacao',
    'aguardando_aprovacao',
    'ordem_gerada',
    'em_transito',
    'entregue',
]

export const STATUS_ORDER: StatusFSM[] = [
    'requisitado',
    'em_cotacao',
    'aguardando_aprovacao',
    'aprovado',
    'ordem_gerada',
    'em_transito',
    'aguardando_entrega',
    'entregue',
]

export function getNextStatus(current: StatusFSM): StatusFSM | null {
    const idx = STATUS_ORDER.indexOf(current)
    if (idx === -1 || idx === STATUS_ORDER.length - 1) return null
    return STATUS_ORDER[idx + 1]
}

export function calcSavingAbsoluto(orcado: number | null, fechado: number | null): number | null {
    if (orcado == null || fechado == null) return null
    return orcado - fechado
}

export function calcSavingPercentual(orcado: number | null, fechado: number | null): number | null {
    if (orcado == null || fechado == null || orcado === 0) return null
    return ((orcado - fechado) / orcado) * 100
}

export function calcLeadTimeDays(startDate: string | null, endDate: string | null): number | null {
    if (!startDate || !endDate) return null
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = end.getTime() - start.getTime()
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value)
}

export function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`
}

export function isDeliveryImminent(dataPrevisao: string | null): boolean {
    if (!dataPrevisao) return false
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const previsao = new Date(dataPrevisao)
    previsao.setHours(0, 0, 0, 0)
    const diff = previsao.getTime() - hoje.getTime()
    const days = diff / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 1
}

export function isOverdue(dataPrevisao: string | null, dataEntregaReal: string | null): boolean {
    if (!dataPrevisao || dataEntregaReal) return false
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const previsao = new Date(dataPrevisao)
    previsao.setHours(0, 0, 0, 0)
    return hoje.getTime() > previsao.getTime()
}
