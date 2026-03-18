import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return '—'
    return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '—'
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ptBR })
}

export function daysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null
    return differenceInDays(parseISO(dateStr), new Date())
}

export function formatMonthYear(dateStr: string): string {
    return format(parseISO(dateStr), 'MMM/yy', { locale: ptBR })
}
