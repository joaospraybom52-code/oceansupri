/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { agendar } from './schedule'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// =============================================================================
// Worker do módulo Controle / aba "Fechamento Banco" (roda na VM via PM2).
//
// Espelha a consulta de conciliação bancária do UAU nas tabelas banco_extrato
// (movimentos) e banco_saldo_base (saldo de cada conta na data-base).
//
// Dois cuidados que vieram da validação contra os relatórios do UAU de
// 13/07/2026:
//
// 1. As linhas com ChequesNaoCompensados = 1 NÃO são lançamentos do período —
//    esse bloco da consulta ignora a data inicial e traz todo cheque em aberto
//    da história (11.316 linhas / R$ 38,7 mi num único dia). São descartadas.
//
// 2. O saldo anterior NÃO pode sair de SaldoNaoConcil_Ant lido na data do
//    relatório: a coluna vem zerada em algumas contas e contas sem movimento
//    no dia nem aparecem na consulta. Guardamos o saldo na DATA_BASE e o app
//    acumula os movimentos — isso reproduziu a coluna "Saldo Anterior" do
//    relatório do UAU ao centavo.
// =============================================================================

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const sqlConfig: sql.config = {
    user: process.env.UAU_DB_USER,
    password: process.env.UAU_DB_PASS,
    database: process.env.UAU_DB_NAME,
    server: process.env.UAU_DB_SERVER!,
    port: parseInt(process.env.UAU_DB_PORT || '14104'),
    options: { encrypt: false, trustServerCertificate: true },
    connectionTimeout: 30000,
    requestTimeout: 900000,
}

const DATA_BASE = process.env.BANCO_DATA_BASE || '20260101'
const DATA_FIM = '20991231'

// Os valores são gravados CRUS, sem arredondar para centavos. O UAU soma os
// valores originais e só arredonda no total — arredondar lançamento a
// lançamento fazia o saldo de algumas contas fechar 1 centavo acima do
// relatório oficial (ex.: conta 99718-4, 56,44 contra 56,43).

function carregarQuery(arquivo: string): string {
    // As queries ficam em arquivo ao lado do worker para não poluir o .ts.
    const candidatos = [
        path.resolve(__dirname, arquivo),                    // repo (npm run sync:banco)
        path.resolve(process.cwd(), 'src', 'workers', arquivo),
        path.resolve(process.cwd(), arquivo),                // VM (arquivos soltos no ~)
    ]
    for (const p of candidatos) if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8')
    throw new Error(`${arquivo} não encontrado em: ` + candidatos.join(' | '))
}

/**
 * Extrato detalhado: só enriquece a conciliação — preenche o histórico dos
 * lançamentos que vêm sem descrição e traz a obra. O cruzamento com
 * banco_extrato é por conta + data + crédito + débito.
 */
async function sincronizarDetalhe(pool: sql.ConnectionPool) {
    const query = carregarQuery('query-banco-detalhe.sql')
        .split("'01/01/2026'").join(`'${DATA_BASE}'`)
    const r = await pool.request().query(query)
    // TipoDet = 1 são as linhas de "insumo comprado" (valor zerado): não são
    // lançamentos, só detalhe do processo — ficam de fora do cruzamento.
    const linhas = (r.recordset as any[])
        .filter(x => Number(x.TipoDet ?? 0) === 0)
        .map(x => ({
            empresa: x.Empresa_Es == null ? null : Number(x.Empresa_Es),
            banco: Number(x.Banco),
            conta: String(x.Conta || '').trim(),
            data: new Date(x.Data).toISOString().slice(0, 10),
            hist: x.Hist ? String(x.Hist).trim() : null,
            numdoc: x.NumDoc ? String(x.NumDoc).trim() : null,
            credito: Number(x.Credito || 0),
            debito: Number(x.Debito || 0),
            obra: x.Obra ? String(x.Obra).trim() : null,
            origem: x.Origem == null ? null : Number(x.Origem),
        }))

    console.log(`[sync-banco] detalhe: ${r.recordset.length} linhas → ${linhas.length} após filtrar TipoDet=1`)
    if (linhas.length === 0) {
        console.warn('[sync-banco] detalhe vazio — mantendo o espelho atual')
        return
    }

    const { error: errDel } = await supabase.from('banco_extrato_detalhe' as any).delete().gte('data', '1900-01-01')
    if (errDel) throw new Error('delete banco_extrato_detalhe: ' + errDel.message)
    const LOTE = 500
    for (let i = 0; i < linhas.length; i += LOTE) {
        const { error } = await supabase.from('banco_extrato_detalhe' as any).insert(linhas.slice(i, i + LOTE) as any)
        if (error) throw new Error(`insert banco_extrato_detalhe (lote ${i}): ${error.message}`)
    }
    console.log(`[sync-banco] detalhe OK — ${linhas.length} linhas`)
}

export async function sincronizarBanco() {
    const inicio = Date.now()
    const query = carregarQuery('query-banco.sql')
        .split("'07/01/2026'").join(`'${DATA_BASE}'`)
        .split("'01/01/2070'").join(`'${DATA_FIM}'`)

    const pool = await sql.connect(sqlConfig)
    let rows: any[]
    try {
        const r = await pool.request().query(query)
        rows = r.recordset
        await sincronizarDetalhe(pool)
    } finally {
        await pool.close()
    }

    const movimentos = rows.filter(x => Number(x.ChequesNaoCompensados) !== 1)
    console.log(`[sync-banco] UAU: ${rows.length} linhas → ${movimentos.length} movimentos (${rows.length - movimentos.length} cheques não compensados descartados)`)

    if (movimentos.length === 0) {
        console.warn('[sync-banco] nenhum movimento retornado — mantendo o espelho atual intacto')
        return
    }

    // ── Saldo base por conta (constante por conta dentro do resultado)
    const bases = new Map<string, { banco: number; conta: string; nome_banco: string | null; saldo: number }>()
    for (const x of movimentos) {
        const conta = String(x.NumConta || '').trim()
        const k = `${x.NumBanco}|${conta}`
        if (!bases.has(k)) {
            bases.set(k, {
                banco: Number(x.NumBanco),
                conta,
                nome_banco: x.Nome_Banco ? String(x.Nome_Banco).trim() : null,
                saldo: Number(x.SaldoNaoConcil_Ant || 0),
            })
        }
    }

    const linhas = movimentos.map(x => ({
        empresa: Number(x.CodEmpresa),
        banco: Number(x.NumBanco),
        conta: String(x.NumConta || '').trim(),
        nome_banco: x.Nome_Banco ? String(x.Nome_Banco).trim() : null,
        data: new Date(x.Data).toISOString().slice(0, 10),
        historico: x.Historico ? String(x.Historico).trim() : null,
        lanct: x.Lanct ? String(x.Lanct).trim() : null,
        cheque: x.Cheque ? String(x.Cheque).trim() : null,
        credito: Number(x.Credito || 0),
        debito: Number(x.Debito || 0),
        tipo_lanc: x.TipoLanc == null ? null : Number(x.TipoLanc),
    }))

    // ── Troca o espelho: só apaga depois de ter os dados novos em mãos
    const { error: errDel } = await supabase.from('banco_extrato' as any).delete().gte('data', '1900-01-01')
    if (errDel) throw new Error('delete banco_extrato: ' + errDel.message)

    const LOTE = 500
    for (let i = 0; i < linhas.length; i += LOTE) {
        const { error } = await supabase.from('banco_extrato' as any).insert(linhas.slice(i, i + LOTE) as any)
        if (error) throw new Error(`insert banco_extrato (lote ${i}): ${error.message}`)
    }

    const { error: errBase } = await supabase.from('banco_saldo_base' as any).upsert(
        Array.from(bases.values()).map(b => ({ ...b, data_base: `${DATA_BASE.slice(0, 4)}-${DATA_BASE.slice(4, 6)}-${DATA_BASE.slice(6, 8)}`, atualizado_em: new Date().toISOString() })) as any,
        { onConflict: 'banco,conta' },
    )
    if (errBase) throw new Error('upsert banco_saldo_base: ' + errBase.message)

    console.log(`[sync-banco] OK — ${linhas.length} movimentos e ${bases.size} contas em ${((Date.now() - inicio) / 1000).toFixed(1)}s`)
}

// agendar() já trata o modo SYNC_ONCE=1 (rodar uma vez e sair).
agendar(sincronizarBanco, 'sync-banco')
