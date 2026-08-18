// Regras da aba DRE Gerencial (módulo Controle).
//
// Estrutura da DRE:
//     Receita por obra (medição)        origem RECEBIDAS
//   − Custo direto da obra              CONTAS PAGAS + CONTROLE FINANCEIRO das obras normais
//   = Margem de contribuição da obra
//   − Cartões corporativos              TRANSFERÊNCIA com "CART" no histórico
//   − Despesas de estrutura             CONTAS PAGAS de SD005 e ADMCO
//   − Despesas diretoria                CONTAS PAGAS das obras DRT*
//   = EBITDA gerencial
//   − Resultado financeiro              CONTROLE FINANCEIRO da sede: rendimentos (+) e juros/IOF/tarifas (−)
//   = Resultado gerencial

/** Obras que representam a estrutura da empresa (sede). */
export const OBRAS_ESTRUTURA = ['SD005', 'ADMCO']
/** Obras da diretoria — linha própria, separada da estrutura. */
export const PREFIXO_DIRETORIA = 'DRT'

export const ehEstrutura = (obra: string | null | undefined) =>
    OBRAS_ESTRUTURA.includes((obra || '').trim().toUpperCase())

export const ehDiretoria = (obra: string | null | undefined) =>
    (obra || '').trim().toUpperCase().startsWith(PREFIXO_DIRETORIA)

/** Obras cujo controle financeiro é analisado para o resultado financeiro. */
export const ehSede = (obra: string | null | undefined) =>
    ['ADMCO', 'SD005'].includes((obra || '').trim().toUpperCase())

/** Transferência de pagamento de cartão (vs. transferência entre contas próprias). */
export const ehCartao = (nominal: string | null | undefined) =>
    (nominal || '').toUpperCase().includes('CART')

export type TipoClassificacao = 'rendimento' | 'financeiro' | 'emprestimo' | 'ignorado'

export const ROTULO_TIPO: Record<TipoClassificacao, string> = {
    rendimento: 'Rendimento (+)',
    financeiro: 'Juros / IOF / tarifas (−)',
    emprestimo: 'Empréstimo / captação',
    ignorado: 'Fora do resultado',
}

// Palavras-chave para o palpite automático. A ordem importa: rendimento é
// testado antes de financeiro porque "REND" aparece dentro de textos que também
// citam tarifa; e empréstimo antes de ignorado.
const RENDIMENTO = ['REND', 'APLICAC', 'APLICAÇ', 'CDB']
const FINANCEIRO = [
    'JUROS', 'IOF', 'TARIFA', 'TAR ', 'TAR-', 'DESAGIO', 'DESÁGIO',
    'PACOTE DE SERVI', 'PACOTE SERVI', 'COBRANC', 'COBRANÇ',
    'SEGURO PRESTAMISTA', 'PRESTAMISTA', 'CH ESP', 'LIM ESPECIAL', 'LIM ESP',
    'SUBSC', 'INTEGR', 'MANUTEN',
]
const EMPRESTIMO = [
    'EMPRESTIMO', 'EMPRÉSTIMO', 'FINAME', 'CAPITAL DE GIRO',
    'PARCELAMENTO MAQUINA', 'PARCELAMENTO MÁQUINA', 'ANTECIPA', 'RESGATE',
    'CARTA DE CREDITO', 'CARTA DE CRÉDITO',
]
// Entradas que claramente não são nem captação nem resultado financeiro.
const IGNORADO = [
    'ESTORNO', 'DEVOLUC', 'DEVOLUÇ', 'DUPLICIDADE', 'DUPLICADA',
    'VENDA', 'SUCATA', 'REEMBOLSO', 'DIFERENC', 'DIFERENÇ', 'RESTITUI',
]

const inclui = (txt: string, lista: string[]) => lista.some(p => txt.includes(p))

/**
 * Palpite do tipo a partir da descrição (Nominal) e do sinal do valor.
 * Serve para semear a tabela dre_gerencial_classificacao e sugerir o tipo de
 * descrições novas — o usuário pode sobrescrever na tela.
 */
export function palpitarTipo(nominal: string | null | undefined, valor: number): TipoClassificacao {
    const t = (nominal || '').toUpperCase().trim()
    if (!t) return 'ignorado'

    if (inclui(t, RENDIMENTO)) return 'rendimento'
    if (inclui(t, EMPRESTIMO)) return 'emprestimo'
    if (inclui(t, IGNORADO)) return 'ignorado'
    if (inclui(t, FINANCEIRO)) return 'financeiro'

    // Sem palavra-chave: saída é custo financeiro, entrada é captação
    // (a regra do usuário: positivo com nome de pessoa = empréstimo).
    return valor < 0 ? 'financeiro' : 'emprestimo'
}

/** Formata em BRL. */
export const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
