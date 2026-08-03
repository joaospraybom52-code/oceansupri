// Montagem da tabela de Acompanhamento de Custo (origem: UAU).
// Fica aqui — e não dentro da página — porque a tela e o relatório em PDF
// precisam produzir EXATAMENTE as mesmas linhas e os mesmos totais.

export type TipoLinhaCusto = 'raiz' | 'subtotal' | 'servico' | 'insumo'

export interface LinhaCusto {
    obra_plt: string
    obra: string | null
    item_plt: string | null
    serv_plt: string | null
    servico: string | null
    insumo: string | null
    ins_cins: string | null
    unid_ins: string | null
    valor_aprov: number | null
    saldo_vlr_vinc: number | null
    ordem: number | null
    atualizado_em: string | null
}

export interface OrcamentoCusto {
    id: string
    obra_plt: string
    item_plt: string
    insumo: string
    valor_planejado: number | null
}

export interface DisplayRow {
    tipo: TipoLinhaCusto
    item: string
    descricao: string
    ins_cins: string
    planej: number
    aprov: number
    vinc: number
}

export const dots = (s: string) => (s.match(/\./g) || []).length

export function statusCusto(planej: number, saldo: number): { txt: string; bg: string; fg: string } {
    if (!planej) return { txt: '', bg: 'transparent', fg: 'var(--text-muted)' }
    if (saldo <= 0) return { txt: '🔴 Estourado', bg: '#F8CBAD', fg: '#9C0006' }
    if (saldo <= 0.4 * planej) return { txt: '🟠 Alerta', bg: '#FFD966', fg: '#7F6000' }
    return { txt: '🟢 Dentro do custo', bg: '#C6EFCE', fg: '#006100' }
}

/**
 * Monta as linhas da obra na hierarquia raiz → subtotal → serviço → insumo.
 *
 * Custo, Vinculado e Planejado por serviço têm chave item_plt + serv_plt: um
 * mesmo item pode ter VÁRIOS serviços (ex.: NES22 01.01.09 tem Impermeabilização,
 * Estrutura de Concreto e Controle Tecnológico) — agrupando só por item, os
 * serviços fundiriam num cabeçalho só. Nesses itens o Planejado do serviço soma
 * apenas os insumos DELE; com serviço único mantém a soma por prefixo do item
 * (cobre insumo do orçamento sem linha no custo_uau).
 */
export function montarLinhasCusto(
    linhas: LinhaCusto[],
    orcamento: OrcamentoCusto[],
    obraSel: string,
): { rows: DisplayRow[]; atualizado: string | null } {
    const ls = linhas.filter(l => l.obra_plt === obraSel)
    const orcObra = orcamento.filter(o => o.obra_plt === obraSel)

    // Planejado (orçamento fixo): por insumo e por prefixo de item
    const planejInsumo = new Map<string, number>()
    for (const o of orcObra) planejInsumo.set(`${o.item_plt}|${(o.insumo || '').trim().toUpperCase()}`, Number(o.valor_planejado || 0))
    const planejPrefixo = (p: string) => orcObra.reduce((s, o) => {
        const it = o.item_plt || ''
        return (it === p || it.startsWith(p + '.')) ? s + Number(o.valor_planejado || 0) : s
    }, 0)

    const servTot: Record<string, { aprov: number; vinc: number; nome: string; planej: number }> = {}
    const servsDoItem: Record<string, Set<string>> = {}
    for (const l of ls) {
        if (String(l.serv_plt) !== '-1') {
            const item = l.item_plt || ''
            const k = `${item}|${l.serv_plt || ''}`
            servTot[k] = servTot[k] || { aprov: 0, vinc: 0, nome: l.servico || '', planej: 0 }
            servTot[k].aprov += Number(l.valor_aprov || 0)
            servTot[k].vinc += Number(l.saldo_vlr_vinc || 0)
            servTot[k].planej += planejInsumo.get(`${item}|${(l.insumo || '').trim().toUpperCase()}`) ?? 0
            ;(servsDoItem[item] = servsDoItem[item] || new Set()).add(String(l.serv_plt || ''))
        }
    }

    const out: DisplayRow[] = []
    let lastServ: string | null = null
    for (const l of ls) {
        const item = l.item_plt || ''
        if (String(l.serv_plt) === '-1') {
            out.push({ tipo: dots(item) === 0 ? 'raiz' : 'subtotal', item, descricao: l.servico || '', ins_cins: '', planej: planejPrefixo(item), aprov: Number(l.valor_aprov || 0), vinc: Number(l.saldo_vlr_vinc || 0) })
            lastServ = null
        } else {
            const sk = `${item}|${l.serv_plt || ''}`
            if (sk !== lastServ) {
                const t = servTot[sk]
                const multi = (servsDoItem[item]?.size ?? 1) > 1
                out.push({ tipo: 'servico', item, descricao: t?.nome || l.servico || '', ins_cins: '', planej: multi ? (t?.planej || 0) : planejPrefixo(item), aprov: t?.aprov || 0, vinc: t?.vinc || 0 })
                lastServ = sk
            }
            const planej = planejInsumo.get(`${item}|${(l.insumo || '').trim().toUpperCase()}`) ?? 0
            out.push({ tipo: 'insumo', item, descricao: l.insumo || '', ins_cins: l.ins_cins || '', planej, aprov: Number(l.valor_aprov || 0), vinc: Number(l.saldo_vlr_vinc || 0) })
        }
    }

    return { rows: out, atualizado: ls[0]?.atualizado_em ?? null }
}

/** Totais da obra = soma das linhas raiz (nível 0 da hierarquia). */
export function totaisDaObra(rows: DisplayRow[]) {
    const raiz = rows.filter(r => r.tipo === 'raiz')
    const planejado = raiz.reduce((s, r) => s + r.planej, 0)
    const custo = raiz.reduce((s, r) => s + r.aprov, 0)
    const vinculado = raiz.reduce((s, r) => s + r.vinc, 0)
    return { planejado, custo, vinculado, saldo: planejado - custo - vinculado, comprometido: custo + vinculado }
}
