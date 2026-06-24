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
