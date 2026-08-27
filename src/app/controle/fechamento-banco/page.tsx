import { createServerSupabaseClient } from '@/lib/supabase/server'
import FechamentoBancoClient from './FechamentoBancoClient'
import { paginarTudo } from '@/lib/supabase/paginar'

export const dynamic = 'force-dynamic'

interface MovRow {
    banco: number; conta: string; nome_banco: string | null; data: string
    historico: string | null; lanct: string | null; cheque: string | null
    credito: number | null; debito: number | null; tipo_lanc: number | null
}

/**
 * Busca todas as linhas paginando EM PARALELO — o PostgREST corta em 1000 por
 * requisição, e o jeito em fila fazia esta tela levar 6,1s (medido 27/08/2026).
 */
function buscarTudo<T>(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    tabela: string, colunas: string,
    ajuste?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<T[]> {
    return paginarTudo<T>(supabase, tabela, colunas, { ajuste })
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

    const [movimentos, anteriores, basesRes, detalhe, obrasRes, obrasEngRes, vgvRes, custoUau] = await Promise.all([
        // Movimentos do período escolhido
        buscarTudo<MovRow>(supabase, 'banco_extrato',
            'banco, conta, nome_banco, data, historico, lanct, cheque, credito, debito, tipo_lanc',
            q => q.gte('data', de).lte('data', ate).order('data').order('banco').order('conta')),
        // Tudo ANTES do início: só o necessário para fechar o saldo anterior
        buscarTudo<{ banco: number; conta: string; credito: number | null; debito: number | null }>(
            supabase, 'banco_extrato', 'banco, conta, credito, debito', q => q.lt('data', de)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('banco_saldo_base').select('banco, conta, nome_banco, data_base, saldo'),
        // Extrato detalhado do período: preenche o histórico vazio e traz a obra
        buscarTudo<{ banco: number; conta: string; data: string; hist: string | null; obra: string | null; credito: number | null; debito: number | null }>(
            supabase, 'banco_extrato_detalhe', 'banco, conta, data, hist, obra, credito, debito',
            q => q.gte('data', de).lte('data', ate)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('obras').select('codigo, nome'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('obras_eng').select('codigo_uau, nome'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('controle_vgv').select('codigo_obra, nome_obra'),
        buscarTudo<{ obra_plt: string; obra: string | null }>(supabase, 'custo_uau', 'obra_plt, obra'),
    ])

    // Contas a pagar (parcelas emitidas em débito) — relatório "Fluxo de Caixa".
    // A data é a PRORROGAÇÃO (data_pagamento). Tabela pequena: traz tudo e o
    // cliente filtra pelo período aplicado.
    const aPagarPromise = buscarTudo<{
        obra: string | null; num_proc: number | null; num_parc: number | null; total_parcelas: number | null
        banco: number | null; conta: string | null; fornecedor: string | null
        obs_pag: string | null; data_pagamento: string | null; valor: number | null
    }>(supabase, 'contas_a_pagar', 'obra, num_proc, num_parc, total_parcelas, banco, conta, fornecedor, obs_pag, data_pagamento, valor')

    // Contas a receber — mesma medida do painel "Próximas Medições":
    // valor = valor_prc, data = data_fim_contrato_ven, descrição = hist_lanc_ven.
    const aReceberPromise = buscarTudo<{
        obra: string | null; num_parc_ger: string | null; cliente: string | null
        hist_lanc_ven: string | null; data_fim_contrato_ven: string | null; valor_prc: number | null
    }>(supabase, 'controle_a_receber', 'obra, num_parc_ger, cliente, hist_lanc_ven, data_fim_contrato_ven, valor_prc')

    // As duas juntas, não uma esperando a outra.
    const [aPagarRows, aReceberRows] = await Promise.all([aPagarPromise, aReceberPromise])

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

    // ── Nome das obras (código → nome). Quatro fontes, da menos para a mais
    //    confiável — a última a escrever vence. custo_uau e controle_vgv vêm
    //    do UAU e cobrem obras antigas que não estão cadastradas no app.
    const nomeObra = new Map<string, string>()
    const registrar = (cod: string | null | undefined, nome: string | null | undefined) => {
        const c = cod?.trim().toUpperCase()
        const n = nome?.trim()
        if (c && n) nomeObra.set(c, n)
    }
    for (const u of custoUau) registrar(u.obra_plt, u.obra)
    for (const v of ((vgvRes.data ?? []) as { codigo_obra: string | null; nome_obra: string | null }[])) {
        registrar(v.codigo_obra, v.nome_obra)
    }
    for (const o of ((obrasEngRes.data ?? []) as { codigo_uau: string | null; nome: string }[])) {
        registrar(o.codigo_uau, o.nome)
    }
    for (const o of ((obrasRes.data ?? []) as { codigo: string | null; nome: string }[])) {
        registrar(o.codigo, o.nome)
    }

    // ── Cruzamento com o extrato detalhado: conta + data + crédito + débito.
    //    A data entra na chave de propósito: só conta + valores casaria
    //    pagamentos de mesmo valor em dias diferentes e traria a obra errada.
    const chave = (banco: number, conta: string, data: string, credito: number, debito: number) =>
        `${banco}|${conta}|${data}|${Number(credito || 0).toFixed(2)}|${Number(debito || 0).toFixed(2)}`

    const mapaDetalhe = new Map<string, { hist: string | null; obra: string | null }>()
    for (const d of detalhe) {
        const k = chave(d.banco, d.conta, d.data, Number(d.credito || 0), Number(d.debito || 0))
        const atual = mapaDetalhe.get(k)
        // Se houver mais de um candidato, fica o que tem obra preenchida.
        if (!atual || (!atual.obra && d.obra)) mapaDetalhe.set(k, { hist: d.hist, obra: d.obra })
    }

    const movimentosEnriquecidos = movimentos.map(m => {
        const det = mapaDetalhe.get(chave(m.banco, m.conta, m.data, Number(m.credito || 0), Number(m.debito || 0)))
        const cod = det?.obra?.trim().toUpperCase() || null
        const nome = cod ? nomeObra.get(cod) : undefined
        return {
            banco: m.banco, conta: m.conta, nomeBanco: m.nome_banco, data: m.data,
            // histórico vazio herda a descrição do extrato detalhado
            historico: (m.historico && m.historico.trim()) ? m.historico : (det?.hist ?? null),
            lanct: m.lanct, cheque: m.cheque,
            credito: Number(m.credito || 0), debito: Number(m.debito || 0),
            tipoLanc: m.tipo_lanc,
            obra: cod ? (nome ? `${cod} — ${nome}` : cod) : null,
        }
    })

    const rotuloObra = (cod0: string | null | undefined) => {
        const cod = cod0?.trim().toUpperCase() || null
        const nome = cod ? nomeObra.get(cod) : undefined
        return { obra: cod, obraLabel: cod ? (nome ? `${cod} — ${nome}` : cod) : null }
    }

    // Linhas do relatório "Fluxo de Caixa": a pagar (Conf_Proc='DVQ') + a receber
    // (Próximas Medições), no mesmo formato.
    const aPagar = [
        ...aPagarRows.map(r => ({
            tipo: 'pagar' as const,
            ...rotuloObra(r.obra),
            numProc: r.num_proc, numParc: r.num_parc, totalParcelas: r.total_parcelas,
            banco: r.banco, conta: r.conta,
            contraparte: r.fornecedor, obs: r.obs_pag,
            data: r.data_pagamento ?? '', valor: Number(r.valor || 0),
        })),
        ...aReceberRows.map(r => ({
            tipo: 'receber' as const,
            ...rotuloObra(r.obra),
            numProc: null, numParc: r.num_parc_ger ? Number(r.num_parc_ger) || null : null, totalParcelas: null,
            banco: null, conta: null,
            contraparte: r.cliente, obs: r.hist_lanc_ven,
            data: r.data_fim_contrato_ven ?? '', valor: Number(r.valor_prc || 0),
        })),
    ].sort((a, b) => a.data.localeCompare(b.data) || (a.obra || '').localeCompare(b.obra || ''))

    return (
        <FechamentoBancoClient
            de={de}
            ate={ate}
            padrao={padrao}
            dataBase={dataBase}
            contas={contas}
            movimentos={movimentosEnriquecidos}
            aPagar={aPagar}
        />
    )
}
