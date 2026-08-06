import { createServerSupabaseClient } from '@/lib/supabase/server'
import FechamentoBancoClient from './FechamentoBancoClient'

export const dynamic = 'force-dynamic'

interface MovRow {
    banco: number; conta: string; nome_banco: string | null; data: string
    historico: string | null; lanct: string | null; cheque: string | null
    credito: number | null; debito: number | null; tipo_lanc: number | null
}

/** Busca todas as linhas paginando — o PostgREST corta em 1000 por requisição. */
async function buscarTudo<T>(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    tabela: string, colunas: string,
    ajuste?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<T[]> {
    const PAGE = 1000
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any
    const out: T[] = []
    for (let from = 0; ; from += PAGE) {
        let q = client.from(tabela).select(colunas).range(from, from + PAGE - 1)
        if (ajuste) q = ajuste(q)
        const { data, error } = await q
        if (error || !data || data.length === 0) break
        out.push(...(data as T[]))
        if (data.length < PAGE) break
    }
    return out
}

const hojeISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

export default async function FechamentoBancoPage({
    searchParams,
}: {
    searchParams: Promise<{ de?: string; ate?: string }>
}) {
    const sp = await searchParams
    const supabase = await createServerSupabaseClient()

    // Data padrão: o último dia com movimento (mais útil que "hoje" quando o
    // sync ainda não rodou), com fallback para hoje.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ult } = await (supabase as any)
        .from('banco_extrato').select('data').order('data', { ascending: false }).limit(1)
    const padrao = ult?.[0]?.data ?? hojeISO()
    const de = sp.de || padrao
    const ate = sp.ate || de

    const [movimentos, anteriores, basesRes] = await Promise.all([
        // Movimentos do período escolhido
        buscarTudo<MovRow>(supabase, 'banco_extrato',
            'banco, conta, nome_banco, data, historico, lanct, cheque, credito, debito, tipo_lanc',
            q => q.gte('data', de).lte('data', ate).order('data').order('banco').order('conta')),
        // Tudo ANTES do início: só o necessário para fechar o saldo anterior
        buscarTudo<{ banco: number; conta: string; credito: number | null; debito: number | null }>(
            supabase, 'banco_extrato', 'banco, conta, credito, debito', q => q.lt('data', de)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('banco_saldo_base').select('banco, conta, nome_banco, data_base, saldo'),
    ])

    const bases = (basesRes.data ?? []) as { banco: number; conta: string; nome_banco: string | null; data_base: string; saldo: number }[]

    // Saldo anterior por conta. Soma os valores CRUS e arredonda só no fim —
    // é assim que o UAU fecha o relatório; arredondar lançamento a lançamento
    // deixava algumas contas 1 centavo acima do oficial.
    const saldoAnt = new Map<string, number>()
    for (const b of bases) saldoAnt.set(`${b.banco}|${b.conta}`, Number(b.saldo || 0))
    for (const m of anteriores) {
        const k = `${m.banco}|${m.conta}`
        saldoAnt.set(k, (saldoAnt.get(k) ?? 0) + Number(m.credito || 0) - Number(m.debito || 0))
    }

    const contas = bases
        .map(b => ({
            banco: b.banco,
            conta: b.conta,
            nomeBanco: b.nome_banco,
            saldoAnterior: Math.round(((saldoAnt.get(`${b.banco}|${b.conta}`) ?? 0) + Number.EPSILON) * 100) / 100,
        }))
        .sort((a, b) => a.banco - b.banco || a.conta.localeCompare(b.conta))

    const dataBase = bases[0]?.data_base ?? null

    return (
        <FechamentoBancoClient
            de={de}
            ate={ate}
            padrao={padrao}
            dataBase={dataBase}
            contas={contas}
            movimentos={movimentos.map(m => ({
                banco: m.banco, conta: m.conta, nomeBanco: m.nome_banco, data: m.data,
                historico: m.historico, lanct: m.lanct, cheque: m.cheque,
                credito: Number(m.credito || 0), debito: Number(m.debito || 0),
                tipoLanc: m.tipo_lanc,
            }))}
        />
    )
}
