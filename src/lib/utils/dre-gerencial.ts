import { categoriaFinanceira } from './insumos-financeiros'

// DRE Gerencial (módulo Controle) — regime de CAIXA, mês a mês.
// Estrutura definida pela diretoria em 19/09/2026 (linhas 1 a 12).

/** Obras que são estrutura, não obra: entram no custo fixo, não no variável. */
export const OBRAS_SEDE = ['SD003', 'SD004', 'SD005', 'ADMCO', 'DRT02', 'DRT03', 'DRT04']

/** A série começa em jan/2026 por decisão da diretoria. */
export const DRE_INICIO = '2026-01'

export interface RecebidoRow {
    obra_rec: string | null
    num_vend: number | null
    data_rec: string | null
    tot_conf: number | null
    tot_desc: number | null
    tot_princ: number | null
}
export interface VendaRecRow {
    obra_vrec: string | null
    num_vend: number | null
    val_desconto_imposto_vrec: number | null
}
export interface PagoInsumoRow {
    obra: string | null
    descrinsumo: string | null
    data_movimento: string | null
    vlr_at_pago: number | null
}
export interface ImpostoPagoRow {
    item: string | null
    cliente: string | null
    data_movimento: string | null
    valor: number | null
}

export type TipoLinhaDre = 'valor' | 'subtotal' | 'resultado'

export interface LinhaDre {
    n: number
    rotulo: string
    detalhe?: string
    tipo: TipoLinhaDre
    valores: Record<string, number>
    total: number
}

const ym = (d: string | null | undefined) => (d ?? '').slice(0, 7)
const norm = (s: string | null | undefined) =>
    (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()

/** Pagamento do Simples federal: item IMPOSTOS SIMPLES nominal ao fisco federal. */
export const ehSimplesFederal = (r: ImpostoPagoRow) => {
    const item = norm(r.item), cli = norm(r.cliente)
    return item.includes('IMPOSTOS SIMPLES')
        && (cli.includes('MINISTERIO DA FAZ') || cli.includes('REC. FEDERAL'))
}

/**
 * ISS + INSS retidos na nota, por mês de recebimento.
 *
 * O imposto é da VENDA e o recebimento vem em parcelas, então ele é rateado
 * pelo principal recebido: parcela que representa 40% do principal da venda
 * leva 40% do imposto. Casamento por CONTRATO (obra + número da venda) — o
 * Power BI casava por valor (TotPrinc = ValProvisaoCurto) e errava quando duas
 * vendas tinham o mesmo valor; em 2026 a diferença era de R$ 84,5 mil.
 */
const chaveVenda = (obra: string | null | undefined, num: number | null | undefined) =>
    `${(obra ?? '').trim().toUpperCase()}|${num ?? ''}`

/**
 * Quanto de imposto retido cabe a CADA parcela recebida.
 *
 * `recebidoCompleto` é sempre a lista inteira, mesmo quando só um pedaço
 * interessa: o rateio precisa do principal TOTAL da venda, senão uma venda com
 * parcela fora do filtro levaria imposto demais.
 */
export function impostoRetidoPorParcela(
    recebidoCompleto: RecebidoRow[], vendas: VendaRecRow[],
): (r: RecebidoRow) => number {
    const impostoDaVenda = new Map<string, number>()
    for (const v of vendas) {
        if (v.num_vend == null) continue
        const k = chaveVenda(v.obra_vrec, v.num_vend)
        impostoDaVenda.set(k, (impostoDaVenda.get(k) ?? 0) + Number(v.val_desconto_imposto_vrec || 0))
    }

    const principalDaVenda = new Map<string, number>()
    for (const r of recebidoCompleto) {
        if (r.num_vend == null) continue
        const k = chaveVenda(r.obra_rec, r.num_vend)
        principalDaVenda.set(k, (principalDaVenda.get(k) ?? 0) + Number(r.tot_princ || 0))
    }

    return (r: RecebidoRow) => {
        if (r.num_vend == null) return 0
        const k = chaveVenda(r.obra_rec, r.num_vend)
        const imposto = impostoDaVenda.get(k)
        const principal = principalDaVenda.get(k)
        if (!imposto || !principal) return 0
        return imposto * (Number(r.tot_princ || 0) / principal)
    }
}

/** Soma do imposto retido das parcelas escolhidas (ex.: as do filtro da KPI'S). */
export function impostoRetidoDeRecebimentos(
    recebidoSelecionado: RecebidoRow[], recebidoCompleto: RecebidoRow[], vendas: VendaRecRow[],
): number {
    const daParcela = impostoRetidoPorParcela(recebidoCompleto, vendas)
    return recebidoSelecionado.reduce((s, r) => s + daParcela(r), 0)
}

export function impostoRetidoPorMes(recebido: RecebidoRow[], vendas: VendaRecRow[]): Record<string, number> {
    const daParcela = impostoRetidoPorParcela(recebido, vendas)
    const porMes: Record<string, number> = {}
    for (const r of recebido) {
        const mes = ym(r.data_rec)
        const v = daParcela(r)
        if (!mes || !v) continue
        porMes[mes] = (porMes[mes] ?? 0) + v
    }
    return porMes
}

export interface DadosDre {
    recebido: RecebidoRow[]
    vendas: VendaRecRow[]
    pagoInsumo: PagoInsumoRow[]
    impostosPagos: ImpostoPagoRow[]
}

/** Monta as 12 linhas da DRE, uma coluna por mês (a partir de DRE_INICIO). */
export function calcularDre({ recebido, vendas, pagoInsumo, impostosPagos }: DadosDre): {
    meses: string[]
    linhas: LinhaDre[]
} {
    const somar = (mapa: Record<string, number>, mes: string, v: number) => {
        if (!mes || mes < DRE_INICIO) return
        mapa[mes] = (mapa[mes] ?? 0) + v
    }

    const recebidoLiquido: Record<string, number> = {}   // TotConf + TotDesc
    const descontos: Record<string, number> = {}         // TotDesc (antecipação)
    for (const r of recebido) {
        const mes = ym(r.data_rec)
        somar(recebidoLiquido, mes, Number(r.tot_conf || 0) + Number(r.tot_desc || 0))
        somar(descontos, mes, Number(r.tot_desc || 0))
    }

    const retido = impostoRetidoPorMes(recebido, vendas)

    const custoVariavel: Record<string, number> = {}
    const custoFixo: Record<string, number> = {}
    const juros: Record<string, number> = {}
    for (const p of pagoInsumo) {
        const mes = ym(p.data_movimento)
        const valor = Number(p.vlr_at_pago || 0)
        const categoria = categoriaFinanceira(p.descrinsumo)
        if (categoria === 'juros') { somar(juros, mes, valor); continue }
        if (categoria) continue                       // empréstimo, tarifa e consórcio não são custo
        const obra = (p.obra ?? '').trim().toUpperCase()
        somar(OBRAS_SEDE.includes(obra) ? custoFixo : custoVariavel, mes, valor)
    }

    const simplesFederal: Record<string, number> = {}
    for (const i of impostosPagos) {
        if (!ehSimplesFederal(i)) continue
        somar(simplesFederal, ym(i.data_movimento), Number(i.valor || 0))
    }

    // Só meses com movimento: a tabela do pago carrega parcelas a vencer lá na
    // frente (com pago zerado) e elas criariam colunas vazias até 2028.
    const fontes = [recebidoLiquido, custoVariavel, custoFixo, juros, simplesFederal, retido, descontos]
    const meses = Array.from(new Set(fontes.flatMap(f => Object.keys(f))))
        .filter(m => m >= DRE_INICIO && fontes.some(f => Math.abs(f[m] ?? 0) > 0.005))
        .sort()

    const porMes = (f: (mes: string) => number): Record<string, number> => {
        const out: Record<string, number> = {}
        for (const m of meses) out[m] = f(m)
        return out
    }
    const v = (mapa: Record<string, number>) => (mes: string) => mapa[mes] ?? 0

    // 1 — o bruto devolve o imposto retido na nota (e o desconto dado)
    const faturamento = porMes(m => (recebidoLiquido[m] ?? 0) + (retido[m] ?? 0))
    const custosVariaveis = porMes(v(custoVariavel))
    const impostos = porMes(m => (retido[m] ?? 0) + (simplesFederal[m] ?? 0))
    const margem = porMes(m => faturamento[m] - custosVariaveis[m] - impostos[m])
    const fixo = porMes(v(custoFixo))
    const ebitda = porMes(m => margem[m] - fixo[m])
    const depreciacao = porMes(() => 0)
    const operacional = porMes(m => ebitda[m] - depreciacao[m])
    const financeiras = porMes(m => (juros[m] ?? 0) + (descontos[m] ?? 0))
    const antesIR = porMes(m => operacional[m] - financeiras[m])
    const irpj = porMes(() => 0)
    const lucro = porMes(m => antesIR[m] - irpj[m])

    const linha = (n: number, rotulo: string, tipo: TipoLinhaDre, valores: Record<string, number>, detalhe?: string): LinhaDre => ({
        n, rotulo, tipo, valores, detalhe,
        total: meses.reduce((s, m) => s + (valores[m] ?? 0), 0),
    })

    return {
        meses,
        linhas: [
            linha(1, 'FATURAMENTO BRUTO', 'subtotal', faturamento, 'Recebido no caixa, com o imposto retido devolvido'),
            linha(2, '(−) Custos variáveis diretos', 'valor', custosVariaveis, 'Pago das obras, sem as obras de estrutura e sem financeiros'),
            linha(3, '(−) Impostos sobre faturamento', 'valor', impostos, 'ISS + INSS retidos na nota e Simples federal pago'),
            linha(4, '= MARGEM DE CONTRIBUIÇÃO', 'subtotal', margem),
            linha(5, '(−) Custo fixo (sede)', 'valor', fixo, OBRAS_SEDE.join(', ')),
            linha(6, '= EBITDA', 'subtotal', ebitda),
            linha(7, '(−) Depreciação e amortização', 'valor', depreciacao, 'Sem informação por enquanto'),
            linha(8, '= RESULTADO OPERACIONAL', 'subtotal', operacional),
            linha(9, '(−) Despesas financeiras', 'valor', financeiras, 'Juros e taxas de antecipação (tarifas bancárias ainda fora)'),
            linha(10, '= RESULTADO ANTES DO IR', 'subtotal', antesIR),
            linha(11, '(−) IRPJ e CSLL', 'valor', irpj, 'Sem informação por enquanto'),
            linha(12, '= LUCRO LÍQUIDO', 'resultado', lucro),
        ],
    }
}

// ── NCG (Necessidade de Capital de Giro) ─────────────────────────────────────
// NCG = ciclo financeiro (dias) x custo diário médio.
// Ciclo = execução + recebimento − pagamento ao fornecedor.
// Prazos padrão definidos com a diretoria em 20/09/2026: 30 dias para executar,
// 48 da nota até o dinheiro entrar e 15 para pagar o fornecedor (a MEDIANA do
// UAU — a média é maior só por causa da cauda de pagamentos com mais de 90 dias,
// que é atraso, não prazo negociado).
export const CICLO_PADRAO = { execucao: 30, recebimento: 48, pagamento: 15 }
export interface CicloNcg { execucao: number; recebimento: number; pagamento: number }
export const diasDoCiclo = (c: CicloNcg) => c.execucao + c.recebimento - c.pagamento

/**
 * Custo diário médio: linhas 2 (custos variáveis), 3 (impostos) e 5 (custo fixo)
 * divididas pelos dias corridos dos meses FECHADOS.
 *
 * As despesas financeiras (linha 9) ficam de fora de propósito: elas são a
 * consequência de financiar o ciclo, não o que precisa ser financiado — contá-las
 * seria somar o custo do dinheiro dentro da necessidade de dinheiro.
 * O mês corrente também fica fora: só tem parte do mês e derrubaria a média.
 */
export function custoDiarioMedio(linhas: LinhaDre[], meses: string[], hoje = new Date()): {
    custoDiario: number; dias: number; total: number; mesesUsados: string[]
} {
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const mesesUsados = meses.filter(m => m < mesAtual)
    const diasNoMes = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()
    const dias = mesesUsados.reduce((s, m) => s + diasNoMes(m), 0)
    const doCusto = linhas.filter(l => [2, 3, 5].includes(l.n))
    const total = mesesUsados.reduce((s, m) => s + doCusto.reduce((t, l) => t + (l.valores[m] ?? 0), 0), 0)
    return { custoDiario: dias ? total / dias : 0, dias, total, mesesUsados }
}
