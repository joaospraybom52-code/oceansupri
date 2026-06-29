// Agendamento dos workers da KPI'S: 3x por dia em horário de São Paulo (BRT),
// independente do fuso da VM (a Oracle Cloud costuma rodar em UTC).
export const HORARIOS: [number, number][] = [[9, 0], [13, 0], [17, 30]]

// Quantos ms faltam até o próximo horário-alvo, no fuso America/Sao_Paulo.
export function msAteProximo(horarios = HORARIOS): number {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo', hour12: false,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    const p = fmt.formatToParts(new Date())
    const g = (t: string) => parseInt(p.find(x => x.type === t)!.value, 10)
    const agoraSeg = (g('hour') % 24) * 3600 + g('minute') * 60 + g('second')
    let best = Infinity
    for (const [h, m] of horarios) {
        let diff = (h * 3600 + m * 60) - agoraSeg
        if (diff <= 0) diff += 86400 // já passou hoje -> amanhã
        best = Math.min(best, diff)
    }
    return best * 1000
}

// Agenda ciclo() para rodar nos horários definidos e se reagenda após cada execução.
// Roda UMA vez ao iniciar (deploy/reboot/crash) e depois nos horários fixos —
// assim os dados não ficam velhos esperando o próximo horário.
export function agendar(ciclo: () => Promise<void>, nome: string): void {
    const proxima = () => {
        const ms = msAteProximo()
        console.log(`[${nome}] Próxima atualização em ~${(ms / 3600000).toFixed(1)}h (09:00, 13:00 ou 17:30 BRT).`)
        setTimeout(async () => { try { await ciclo() } finally { proxima() } }, ms)
    }
    ciclo().finally(proxima)
}
