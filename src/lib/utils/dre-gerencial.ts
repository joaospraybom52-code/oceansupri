// Regras da aba DRE Gerencial (módulo Controle).
//
// Estrutura da DRE:
//     Receita por obra (medição)        origem RECEBIDAS
//   − Custo direto da obra              CONTAS PAGAS + CONTROLE FINANCEIRO das obras normais
//   = Margem de contribuição da obra
//   − Cartões corporativos              TRANSFERÊNCIA com "CART" no histórico
//   − Despesas de estrutura             CONTAS PAGAS da ADMCO
//   − Despesas diretoria                CONTAS PAGAS das obras DRT*
//   = EBITDA gerencial
//   − Resultado financeiro              CONTROLE FINANCEIRO da sede: rendimentos (+) e juros/IOF/tarifas (−)
// Fora do resultado: a obra SD005 (empréstimo bancário) vai para captação.
//   = Resultado gerencial
//
// Qualquer movimento pode ser mandado para outra linha manualmente
// (tabela dre_gerencial_linha) — a regra manual vence a automática.

/** Obras que representam a estrutura da empresa (sede). */
export const OBRAS_ESTRUTURA = ['ADMCO']
/** SD005 é empréstimo bancário: sai do resultado e vai para captação. */
export const OBRA_CAPTACAO = 'SD005'

export const ehCaptacao = (obra: string | null | undefined) =>
    (obra || '').trim().toUpperCase() === OBRA_CAPTACAO
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

// ─────────────────────────────────────────────────────────────────────────────
// Classificação MANUAL da linha da DRE (tabela dre_gerencial_linha).
// A regra automática acima define a linha pelo par obra/origem; aqui o usuário
// manda um custo para outra linha quando a regra não serve.
// ─────────────────────────────────────────────────────────────────────────────

/** Todo destino possível de um movimento — as 6 linhas da DRE + o que fica fora. */
export type LinhaDre =
    | 'receita' | 'custo' | 'cartao' | 'estrutura' | 'diretoria' | 'financeiro'
    | 'emprestimo' | 'entre_contas' | 'ignorado'

export const ROTULO_LINHA: Record<LinhaDre, string> = {
    receita: 'Receita por obra',
    custo: 'Custo direto da obra',
    cartao: 'Cartões corporativos',
    estrutura: 'Despesas de estrutura',
    diretoria: 'Despesas diretoria',
    financeiro: 'Resultado financeiro',
    emprestimo: 'Empréstimo / captação (fora)',
    entre_contas: 'Transferência entre contas (fora)',
    ignorado: 'Fora do resultado',
}

/** Ordem do seletor: primeiro as linhas do resultado, depois o que fica fora. */
export const LINHAS_SELECIONAVEIS: LinhaDre[] = [
    'receita', 'custo', 'cartao', 'estrutura', 'diretoria', 'financeiro',
    'emprestimo', 'entre_contas', 'ignorado',
]

export interface RegraLinha {
    obra: string
    descr_comp: string   // '' = qualquer despesa da obra
    nominal: string      // '' = qualquer nominal da despesa
    linha: LinhaDre
}

/** Normaliza um segmento da chave (MAIÚSCULO, sem espaços nas pontas). */
export const chaveSeg = (v: string | null | undefined) => (v || '').trim().toUpperCase()

export const chaveRegra = (obra: string | null | undefined, descr?: string | null, nominal?: string | null) =>
    `${chaveSeg(obra)}|${chaveSeg(descr)}|${chaveSeg(nominal)}`

/**
 * Regra manual que vale para um movimento, da mais específica para a mais ampla:
 * obra+despesa+nominal → obra+despesa → obra. Retorna null se não houver.
 */
export function linhaManual(
    regras: Map<string, LinhaDre>,
    obra: string | null | undefined,
    descr: string | null | undefined,
    nominal: string | null | undefined,
): LinhaDre | null {
    return regras.get(chaveRegra(obra, descr, nominal))
        ?? regras.get(chaveRegra(obra, descr, ''))
        ?? regras.get(chaveRegra(obra, '', ''))
        ?? null
}

/** Rótulo do alcance de uma regra, para mostrar na tela. */
export function escopoRegra(r: RegraLinha): string {
    if (r.nominal) return `${r.obra} · ${r.descr_comp} · ${r.nominal}`
    if (r.descr_comp) return `${r.obra} · ${r.descr_comp} (toda a despesa)`
    return `${r.obra} (obra inteira)`
}

/** Formata em BRL. */
export const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
