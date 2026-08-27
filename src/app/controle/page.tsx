import { createServerSupabaseClient } from '@/lib/supabase/server'
import ControleClient from '@/components/controle/ControleClient'

export const dynamic = 'force-dynamic'

// =============================================================================
// Painel de Recebimentos (/controle).
//
// A página SOMAVA no JavaScript: baixava controle_pago_apagar, controle_recebido,
// contas_a_pagar e controle_a_receber inteiras — 9.684 linhas em 14 consultas
// EM FILA — e agrupava aqui. Em 27/08/2026 a função pendurou e o módulo ficou
// inacessível (o middleware liberava em 200 e o `λ` nunca terminava).
//
// Agora quem soma é o Postgres (views vw_controle_*, mesma regra e mesmos
// números — conferido: R$ 76.606.814,87 dos dois jeitos) e as buscas vão TODAS
// EM PARALELO, com limite de tempo. Uma consulta lenta não segura mais as outras
// nem pendura a página.
// =============================================================================

/** Teto de espera do carregamento inteiro. Melhor a tela vir vazia que travada. */
const LIMITE_MS = 20000

interface LinhaDia { obra: string | null; data: string | null; valor: number | string | null }
interface LinhaMes { obra: string | null; ym: string | null; valor: number | string | null; pago: number | string | null }

/**
 * Traz a view inteira paginando em PARALELO (o PostgREST corta em 1000 por
 * requisição): pega a 1ª página junto com a contagem e dispara o resto de uma vez.
 */
async function buscarTudo<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any, view: string, colunas: string,
): Promise<T[]> {
    const PAGE = 1000
    const { data, count, error } = await supabase
        .from(view).select(colunas, { count: 'exact' }).range(0, PAGE - 1)
    if (error || !data) return []
    const total = count ?? data.length
    if (total <= PAGE) return data as T[]

    const paginas: Promise<T[]>[] = []
    for (let from = PAGE; from < total; from += PAGE) {
        paginas.push(
            supabase.from(view).select(colunas).range(from, from + PAGE - 1)
                .then((r: { data: T[] | null }) => r.data ?? []),
        )
    }
    return [...(data as T[]), ...(await Promise.all(paginas)).flat()]
}

/** Não deixa a página pendurar: no estouro devolve o padrão e segue. */
function comLimite<T>(p: Promise<T>, ms: number, padrao: T): Promise<T> {
    return Promise.race([
        p.catch(() => padrao),
        new Promise<T>(res => setTimeout(() => res(padrao), ms)),
    ])
}

const num = (v: number | string | null) => Number(v ?? 0) || 0
const dia = (v: string | null) => (v ?? '').slice(0, 10)

export default async function ControlePage() {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()

    // Tudo em paralelo: o tempo da página passa a ser o da consulta mais lenta,
    // não a soma de todas.
    const [perm, obras, medicoes, comprometido, pagoDia, recDia, aPagarDia, aReceberDia] = await Promise.all([
        comLimite((async () => {
            if (!user?.email) return null
            const { data } = await supabase
                .from('permissao_modulocontrole').select('pode_editar').eq('email', user.email).maybeSingle()
            return data as { pode_editar?: boolean } | null
        })(), LIMITE_MS, null),

        comLimite((async () => {
            const { data } = await supabase
                .from('obras').select('id, nome, codigo, cidade').eq('ativo', true).order('nome', { ascending: true })
            return data ?? []
        })(), LIMITE_MS, []),

        comLimite((async () => {
            const { data } = await supabase
                .from('controle_medicoes')
                .select('id, obra_id, valor_medicao, mes_recebimento, tipo, nota_fiscal, observacoes, percentual_recebido, mes_recebimento_real, iss_percentual, inss_percentual, created_at, obra:obras(id, nome, codigo, cidade)')
                .order('mes_recebimento', { ascending: true })
            return data ?? []
        })(), LIMITE_MS, []),

        comLimite(buscarTudo<LinhaMes>(supabase, 'vw_controle_comprometido_mes', 'obra, ym, valor, pago'), LIMITE_MS, []),
        comLimite(buscarTudo<LinhaDia>(supabase, 'vw_controle_pago_dia', 'obra, data, valor'), LIMITE_MS, []),
        comLimite(buscarTudo<LinhaDia>(supabase, 'vw_controle_recebido_dia', 'obra, data, valor'), LIMITE_MS, []),
        comLimite(buscarTudo<LinhaDia>(supabase, 'vw_controle_apagar_dia', 'obra, data, valor'), LIMITE_MS, []),
        comLimite(buscarTudo<LinhaDia>(supabase, 'vw_controle_areceber_dia', 'obra, data, valor'), LIMITE_MS, []),
    ])

    const serie = (linhas: LinhaDia[]) => linhas
        .filter(r => r.obra && r.data)
        .map(r => ({ obra: r.obra as string, data: dia(r.data), valor: num(r.valor) }))

    return (
        <ControleClient
            obras={obras as never}
            medicoesIniciais={medicoes as never}
            podeEditar={perm?.pode_editar ?? false}
            comprometido={comprometido
                .filter(r => r.obra && r.ym)
                .map(r => ({ obra: r.obra as string, ym: r.ym as string, valor: num(r.valor), pago: num(r.pago) }))}
            fluxoRecebido={serie(recDia)}
            fluxoPago={serie(pagoDia)}
            fluxoAPagar={serie(aPagarDia)}
            fluxoAReceber={serie(aReceberDia)}
        />
    )
}
