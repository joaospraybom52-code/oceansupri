import type { DisplayRow } from './custo'

// Obras da DIRETORIA: aparecem só na aba "Obras diretoria" (admin) e são
// excluídas do Acompanhamento de Custo, que é visível para todo o módulo Obras.
//
// O worker sync-custo.ts repete essa lista numa const própria: ele é copiado
// sozinho para a VM Oracle (scp do .ts) e não enxerga src/lib.
export const OBRAS_DIRETORIA = ['ES001']

/** Filtro do PostgREST: `.not('obra_plt', 'in', foraDaDiretoria())` */
export const foraDaDiretoria = () => `(${OBRAS_DIRETORIA.join(',')})`

export interface VendaUau {
    num_ven: number
    origem: string
    status_ven: number | null
    cliente: string | null
    valor_tot: number | null
    data_ven: string | null
}

export interface VinculoCliente {
    item_plt: string
    cliente: string
}

export interface GrupoCliente {
    chave: string
    nome: string
    itens: string[]
    custo: number
    recebido: number
    aReceber: number
    saldo: number
}

const norm = (s: string) =>
    (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

/** Venda paga (o UAU move para VendasRecebidas com Status 3); o resto é a receber. */
export const ehRecebida = (v: VendaUau) => v.status_ven === 3

/**
 * Resultado por cliente da obra da diretoria: cada item pai entra no grupo do
 * cliente vinculado (um cliente tem várias usinas), e item sem vínculo vira um
 * grupo dele mesmo — tem custo e nenhuma receita. Cliente com venda e sem item
 * vinculado também aparece, com custo zero, para nenhum recebimento sumir.
 *
 * Saldo = Recebido − Custo (decisão da diretoria em 15/09/2026).
 */
export function agruparPorCliente(
    rows: DisplayRow[],
    vendas: VendaUau[],
    vinculos: VinculoCliente[],
): { lista: GrupoCliente[]; total: Omit<GrupoCliente, 'chave' | 'nome' | 'itens'> } {
    const porItem = new Map<string, string>()
    for (const v of vinculos) porItem.set(v.item_plt, v.cliente)

    const grupos = new Map<string, GrupoCliente>()
    const pegar = (chave: string, nome: string): GrupoCliente => {
        const g = grupos.get(chave) ?? { chave, nome, itens: [], custo: 0, recebido: 0, aReceber: 0, saldo: 0 }
        grupos.set(chave, g)
        return g
    }

    for (const r of rows.filter(r => r.tipo === 'raiz')) {
        const cliente = porItem.get(r.item)
        const g = cliente
            ? pegar(`cli:${norm(cliente)}`, cliente)
            : pegar(`item:${r.item}`, `${r.item} — ${r.descricao}`)
        g.itens.push(r.item)
        g.custo += r.aprov
    }

    for (const v of vendas) {
        const g = pegar(`cli:${norm(v.cliente || '')}`, v.cliente || '(sem cliente)')
        const valor = Number(v.valor_tot || 0)
        if (ehRecebida(v)) g.recebido += valor
        else g.aReceber += valor
    }

    const lista = Array.from(grupos.values())
        .map(g => ({ ...g, saldo: g.recebido - g.custo }))
        .sort((a, b) => b.recebido - a.recebido || b.custo - a.custo)

    const total = lista.reduce((s, g) => ({
        custo: s.custo + g.custo,
        recebido: s.recebido + g.recebido,
        aReceber: s.aReceber + g.aReceber,
        saldo: s.saldo + g.saldo,
    }), { custo: 0, recebido: 0, aReceber: 0, saldo: 0 })

    return { lista, total }
}
