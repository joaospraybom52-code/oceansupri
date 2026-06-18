'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Clock, CalendarDays } from 'lucide-react'

type StatusEnvio = 'no_prazo' | 'atrasada' | 'pendente' | 'nao_cadastrada'

interface Programacao {
    id: string
    semana_referente_inicio: string
    semana_referente_fim: string
    status_envio: 'no_prazo' | 'atrasada' | 'pendente'
    tarefas?: { status: string }[]
}

interface WeekCardData {
    weekNum: number
    inicio: Date
    fim: Date
    status: StatusEnvio
    progId?: string
    hasPendingTasks?: boolean
}

export default function ProgramacaoGridClient({
    programacoes,
    obraId,
    previsaoInicio,
    previsaoTermino
}: {
    programacoes: Programacao[]
    obraId: string
    previsaoInicio?: string
    previsaoTermino?: string
}) {
    const router = useRouter()
    const [year, setYear] = useState(new Date().getFullYear())

    // Gera as semanas do ano selecionado com base nas regras ISO-like
    const weeks = useMemo(() => {
        const getFirstMonday = (y: number) => {
            const d = new Date(y, 0, 1, 12, 0, 0) // Ao meio-dia para evitar problemas de fuso
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1)
            return new Date(d.setDate(diff))
        }

        let currentMonday = getFirstMonday(year)
        const weeksArray: { weekNum: number; inicio: Date; fim: Date }[] = []
        let weekNum = 1

        while (true) {
            const thursday = new Date(currentMonday)
            thursday.setDate(thursday.getDate() + 3)

            // Se a quinta-feira já for do ano que vem, paramos a contagem (Regra ISO)
            if (thursday.getFullYear() > year) {
                break
            }

            const currentSaturday = new Date(currentMonday)
            currentSaturday.setDate(currentSaturday.getDate() + 5) // Segunda + 5 = Sábado

            weeksArray.push({
                weekNum,
                inicio: new Date(currentMonday),
                fim: new Date(currentSaturday)
            })

            currentMonday.setDate(currentMonday.getDate() + 7)
            weekNum++
        }

        return weeksArray
    }, [year])

    // Combina as semanas geradas com os dados do banco
    const weekCards: WeekCardData[] = useMemo(() => {
        let cards = weeks.map((w) => {
            // Formatar localmente para 'YYYY-MM-DD' para comparar com string do banco
            const inicioStr = w.inicio.toISOString().split('T')[0]
            
            const found = programacoes.find(p => p.semana_referente_inicio === inicioStr)
            const pendingTasks = found?.tarefas?.some(t => t.status === 'planejada') || false

            return {
                weekNum: w.weekNum,
                inicio: w.inicio,
                fim: w.fim,
                status: found ? found.status_envio : 'nao_cadastrada',
                progId: found ? found.id : undefined,
                hasPendingTasks: pendingTasks
            } as WeekCardData
        })

        let projectFirstMonday: Date | null = null

        if (previsaoInicio) {
            const startDate = new Date(previsaoInicio + 'T00:00:00')
            
            // Calculate the Monday of the project's start week
            const day = startDate.getDay()
            const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
            projectFirstMonday = new Date(startDate.getTime())
            projectFirstMonday.setDate(diff)
            projectFirstMonday.setHours(0,0,0,0)

            // Keep weeks where the end of the week is on or after the project start date
            cards = cards.filter(c => c.fim >= startDate)
        }

        if (previsaoTermino) {
            const endDate = new Date(previsaoTermino + 'T23:59:59')
            // Keep weeks where the start of the week is on or before the project end date
            cards = cards.filter(c => c.inicio <= endDate)
        }

        // If we have a start date, renumber the weeks so Week 1 is the project's first week
        if (projectFirstMonday) {
            return cards.map(c => {
                const weekMonday = new Date(c.inicio.getTime())
                weekMonday.setHours(0,0,0,0)
                
                const utc1 = Date.UTC(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate())
                const utc2 = Date.UTC(projectFirstMonday!.getFullYear(), projectFirstMonday!.getMonth(), projectFirstMonday!.getDate())
                
                const diffDays = Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24))
                const relativeWeekNum = Math.floor(diffDays / 7) + 1
                
                return { ...c, weekNum: relativeWeekNum }
            })
        }

        return cards
    }, [weeks, programacoes, previsaoInicio, previsaoTermino])

    const handleCardClick = (card: WeekCardData) => {
        if (card.progId) {
            router.push(`/obras-eng/${obraId}/programacao/${card.progId}`)
        } else {
            const inicioStr = card.inicio.toISOString().split('T')[0]
            const fimStr = card.fim.toISOString().split('T')[0]
            router.push(`/obras-eng/${obraId}/programacao/nova?inicio=${inicioStr}&fim=${fimStr}`)
        }
    }

    const renderIcon = (status: StatusEnvio) => {
        if (status === 'no_prazo') return <CheckCircle2 size={24} color="#10b981" />
        if (status === 'atrasada') return <AlertCircle size={24} color="#ef4444" />
        if (status === 'pendente') return <Clock size={24} color="#f59e0b" />
        return <CalendarDays size={24} color="#64748b" />
    }

    const renderBadge = (status: StatusEnvio, hasPendingTasks?: boolean) => {
        let text = ''
        let bg = ''
        let color = ''

        switch (status) {
            case 'no_prazo': text = 'Criada no período certo'; bg = 'rgba(16, 185, 129, 0.1)'; color = '#10b981'; break;
            case 'atrasada': text = 'Criado atrasado'; bg = 'rgba(239, 68, 68, 0.1)'; color = '#ef4444'; break;
            case 'pendente': text = 'Pendente'; bg = 'rgba(245, 158, 11, 0.1)'; color = '#f59e0b'; break;
            case 'nao_cadastrada': text = 'Não Cadastrada'; bg = 'rgba(255, 255, 255, 0.05)'; color = '#94a3b8'; break;
        }

        if (hasPendingTasks && (status === 'no_prazo' || status === 'atrasada')) {
            text = `Tarefas Pendentes - ${text}`
            color = '#f59e0b'
            bg = 'rgba(245, 158, 11, 0.1)'
        }

        return (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', background: bg, color: color }}>
                {text}
            </span>
        )
    }

    return (
        <div>
            {/* Header / Ano Selector */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Visão Anual - Programação Semanal</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        Selecione a semana para visualizar ou planejar a rotina.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={() => setYear(y => y - 1)} 
                        className="btn-secondary" 
                        style={{ padding: '8px' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span style={{ fontSize: '20px', fontWeight: 800, width: '60px', textAlign: 'center' }}>
                        {year}
                    </span>
                    <button 
                        onClick={() => setYear(y => y + 1)} 
                        className="btn-secondary" 
                        style={{ padding: '8px' }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Grid de Semanas */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '20px'
            }}>
                {weekCards.map((card) => {
                    const isActive = card.status !== 'nao_cadastrada'
                    const borderColor = card.status === 'no_prazo' ? 'rgba(16,185,129,0.3)' : card.status === 'atrasada' ? 'rgba(239,68,68,0.3)' : card.status === 'pendente' ? 'rgba(245,158,11,0.3)' : 'var(--border-glass)'
                    
                    return (
                        <div 
                            key={card.weekNum}
                            onClick={() => handleCardClick(card)}
                            className="glass-card hover-lift"
                            style={{ 
                                padding: '20px', 
                                cursor: 'pointer', 
                                border: `1px solid ${borderColor}`,
                                transition: 'all 0.2s ease',
                                opacity: isActive ? 1 : 0.6
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Semana {card.weekNum}
                                </span>
                                {renderIcon(card.status)}
                            </div>
                            
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {card.inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} 
                                    {' '}a{' '}
                                    {card.fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                {renderBadge(card.status, card.hasPendingTasks)}
                            </div>
                        </div>
                    )
                })}
            </div>
            
            {/* Legenda */}
            <div style={{ marginTop: '40px', display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No Prazo</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Atrasada</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pendente</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#64748b' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Não Cadastrada</span>
                </div>
            </div>
        </div>
    )
}
