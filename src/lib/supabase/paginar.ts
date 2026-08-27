/* eslint-disable @typescript-eslint/no-explicit-any */

// Paginação em PARALELO para as telas que precisam da tabela inteira.
//
// O PostgREST corta em 1000 linhas por requisição. O jeito ingênuo — pedir
// página 0, esperar, pedir página 1, esperar... — transforma 21.935 linhas em
// 22 idas ao Supabase EM FILA. Medido em 27/08/2026: a DRE Gerencial levava
// 11,8s só nisso.
//
// Aqui a 1ª página vem junto com a contagem exata e o resto das páginas é
// disparado de uma vez: o tempo passa a ser o da página mais lenta, não a soma.

const PAGE = 1000

/** Teto de espera. No estouro devolve o que tiver em vez de pendurar a página. */
const LIMITE_PADRAO_MS = 20000

export interface OpcoesPaginar {
    /** Ajusta a consulta (filtros, ordenação). Aplicado em todas as páginas. */
    ajuste?: (q: any) => any
    limiteMs?: number
}

export async function paginarTudo<T>(
    supabase: any, tabela: string, colunas: string, opcoes: OpcoesPaginar = {},
): Promise<T[]> {
    const { ajuste, limiteMs = LIMITE_PADRAO_MS } = opcoes
    const monta = (from: number, comContagem = false) => {
        let q = supabase.from(tabela).select(colunas, comContagem ? { count: 'exact' } : undefined)
        if (ajuste) q = ajuste(q)
        return q.range(from, from + PAGE - 1)
    }

    const buscar = async (): Promise<T[]> => {
        const { data, count, error } = await monta(0, true)
        if (error || !data) return []
        const total = count ?? data.length
        if (total <= PAGE) return data as T[]

        const restantes: Promise<T[]>[] = []
        for (let from = PAGE; from < total; from += PAGE) {
            restantes.push(monta(from).then((r: { data: T[] | null }) => r.data ?? []))
        }
        return [...(data as T[]), ...(await Promise.all(restantes)).flat()]
    }

    return Promise.race([
        buscar().catch(() => [] as T[]),
        new Promise<T[]>(res => setTimeout(() => res([]), limiteMs)),
    ])
}
