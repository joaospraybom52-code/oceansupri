// Valor de uma medição — a regra vale para a lista, o painel da obra, o painel
// geral e o relatório, então mora aqui para não divergir entre as telas.
//
//   tipo = 'sinal'        -> valor_sinal      (entrada/adiantamento)
//   valor_direto != null  -> valor_direto     (lançado à mão, sem planilha)
//   senão                 -> soma dos itens medidos
//
// valor_direto NULO (e não zero) é o que separa "lancei o total à mão" de
// "medi item a item e deu zero".

export interface MedicaoValor {
    tipo?: string | null
    valor_sinal?: number | null
    valor_direto?: number | null
}

export const ehSinal = (m: MedicaoValor) => m.tipo === 'sinal'

/** Medição lançada pelo valor total, sem passar pela planilha. */
export const ehValorDireto = (m: MedicaoValor) =>
    !ehSinal(m) && m.valor_direto != null

/** Valor bruto da medição. `somaItens` é a soma de medicao_itens.valor_medido. */
export function valorDaMedicao(m: MedicaoValor, somaItens: number): number {
    if (ehSinal(m)) return Number(m.valor_sinal || 0)
    if (m.valor_direto != null) return Number(m.valor_direto || 0)
    return somaItens
}
