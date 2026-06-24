// Cálculo da curva S / linha de base.
// O usuário cadastra LB1 e LB2 (linha de base do MS Project) e preenche o Real
// semana a semana. A Tendência é projetada a partir do desempenho atual.

export interface SemanaCurva {
    semana_ref: string          // 'YYYY-MM-DD'
    lb1_pct: number | null
    lb2_pct: number | null
    real_pct: number | null
}

export interface SemanaComTendencia extends SemanaCurva {
    tendencia_pct: number | null
}

/**
 * Tendência:
 *  - seja k a última semana com Real preenchido;
 *  - SPI (índice de desempenho) = Real_k / LB1_k  (se LB1_k = 0 → 1);
 *  - semanas ≤ k → tendência = Real (o que de fato aconteceu);
 *  - semanas  > k → tendência = min(100, LB1_semana × SPI).
 * Sem nenhum Real, não há base para projetar → tendência = null.
 */
export function calcularTendencia(semanas: SemanaCurva[]): SemanaComTendencia[] {
    let k = -1
    for (let i = 0; i < semanas.length; i++) {
        if (semanas[i].real_pct != null) k = i
    }
    if (k === -1) {
        return semanas.map(s => ({ ...s, tendencia_pct: null }))
    }
    const lb1k = semanas[k].lb1_pct
    const spi = lb1k && lb1k > 0 ? (semanas[k].real_pct as number) / lb1k : 1
    return semanas.map((s, i) => {
        if (i <= k) return { ...s, tendencia_pct: s.real_pct }
        if (s.lb1_pct == null) return { ...s, tendencia_pct: null }
        return { ...s, tendencia_pct: Math.min(100, s.lb1_pct * spi) }
    })
}

/** Primeira semana (data) em que a tendência atinge 100%. null se nunca atinge. */
export function terminoTendencia(semanas: SemanaComTendencia[]): string | null {
    const hit = semanas.find(s => s.tendencia_pct != null && s.tendencia_pct >= 100)
    return hit ? hit.semana_ref : null
}

export interface PontoCurva extends SemanaComTendencia { projetado?: boolean }

const MS_SEMANA = 7 * 86400000
const msDe = (d: string) => Date.parse(d + 'T00:00:00Z')
const isoDe = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/**
 * Projeta a tendência ALÉM das semanas cadastradas, no ritmo real atual, até
 * atingir 100% — para estimar a data de término da obra se o ritmo continuar.
 * Retorna a série completa (cadastrada + projetada) e a data de término.
 */
export function projetarConclusao(semanas: SemanaComTendencia[]): { pontos: PontoCurva[], dataTermino: string | null } {
    const pontos: PontoCurva[] = semanas.map(s => ({ ...s }))
    if (semanas.length === 0) return { pontos, dataTermino: null }

    // Já atinge 100% dentro do cadastrado?
    const cross = semanas.find(s => s.tendencia_pct != null && s.tendencia_pct >= 100)
    if (cross) return { pontos, dataTermino: cross.semana_ref }

    // Ritmo real (%/semana) entre o primeiro e o último Real preenchido
    const reais = semanas.filter(s => s.real_pct != null)
    if (reais.length === 0) return { pontos, dataTermino: null }
    const primeiro = reais[0], ultimo = reais[reais.length - 1]
    const semanasReais = (msDe(ultimo.semana_ref) - msDe(primeiro.semana_ref)) / MS_SEMANA
    const v = semanasReais > 0
        ? ((ultimo.real_pct as number) - (primeiro.real_pct as number)) / semanasReais
        : (ultimo.real_pct as number) // só um ponto: assume esse avanço por semana
    if (!v || v <= 0) return { pontos, dataTermino: null }

    // Parte do último ponto da curva (última tendência conhecida)
    const ultTend = [...semanas].reverse().find(s => s.tendencia_pct != null)
    if (!ultTend) return { pontos, dataTermino: null }
    let val = ultTend.tendencia_pct as number
    let ms = msDe(ultTend.semana_ref)
    let guard = 0
    while (val < 100 && guard < 520) {
        guard++
        const prev = val
        ms += MS_SEMANA
        val += v
        if (val >= 100) {
            const frac = (100 - prev) / v // fração de semana até cruzar 100
            const msTermino = (ms - MS_SEMANA) + frac * MS_SEMANA
            pontos.push({ semana_ref: isoDe(msTermino), lb1_pct: null, lb2_pct: null, real_pct: null, tendencia_pct: 100, projetado: true })
            return { pontos, dataTermino: isoDe(msTermino) }
        }
        pontos.push({ semana_ref: isoDe(ms), lb1_pct: null, lb2_pct: null, real_pct: null, tendencia_pct: val, projetado: true })
    }
    return { pontos, dataTermino: null }
}
