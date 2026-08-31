// Insumos FINANCEIROS — empréstimo, juros, tarifa bancária e consórcio.
//
// Não são custo de obra: são dinheiro de banco entrando e saindo. Ficavam
// misturados no Total Pago da KPI'S e inflavam o Balanço da Obra — só em 2026
// eram R$ 4,8 milhões dentro de um "Total Pago" de R$ 24,2 milhões.
//
// Saíram das medidas da KPI'S e ganharam aba própria.
//
// ⚠️ O UAU tem TRÊS nomes para a mesma coisa — 'EMPRESTIMOS',
// 'PAGAMENTO DE EMPRESTIMOS' e 'PRINCIPAL DO EMPRÉSTIMO' (este só a partir de
// 03/2026). Por isso a classificação é por PALAVRA e sem acento, não por nome
// exato: nome novo com a mesma palavra entra sozinho na categoria certa.

export type CategoriaFinanceira = 'emprestimo' | 'juros' | 'tarifa' | 'consorcio'

export const ROTULO_CATEGORIA: Record<CategoriaFinanceira, string> = {
    emprestimo: 'Empréstimos',
    juros: 'Juros',
    tarifa: 'Tarifas bancárias',
    consorcio: 'Consórcio',
}

export const CORES_CATEGORIA: Record<CategoriaFinanceira, string> = {
    emprestimo: '#6366f1',
    juros: '#ef4444',
    tarifa: '#f59e0b',
    consorcio: '#22d3ee',
}

export const CATEGORIAS: CategoriaFinanceira[] = ['emprestimo', 'juros', 'tarifa', 'consorcio']

/** MAIÚSCULO e sem acento — 'PRINCIPAL DO EMPRÉSTIMO' vira '...EMPRESTIMO'. */
const semAcento = (s: string | null | undefined) =>
    (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()

/** Categoria financeira do insumo, ou null quando é custo de obra normal. */
export function categoriaFinanceira(descrinsumo: string | null | undefined): CategoriaFinanceira | null {
    const t = semAcento(descrinsumo)
    if (!t) return null
    if (t.includes('EMPREST')) return 'emprestimo'
    if (t.includes('JUROS')) return 'juros'
    if (t.includes('TARIFA')) return 'tarifa'
    if (t.includes('CONSORCIO')) return 'consorcio'
    return null
}

/** Atalho: este insumo é financeiro (logo, fora das medidas de obra)? */
export const ehInsumoFinanceiro = (descrinsumo: string | null | undefined) =>
    categoriaFinanceira(descrinsumo) !== null
