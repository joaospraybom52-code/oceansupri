/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { agendar } from './schedule'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Worker da aba EMPRÉSTIMOS, JUROS, TARIFAS E CONSÓRCIO (módulo Controle).
//
// Traz da VwDesembolso só os insumos financeiros, separando por STATUS da
// parcela — regra do usuário: entra emissão de pagamento e pago, NÃO entra o
// "a pagar" em aberto.
//   StatusParc_Des = 1  -> emissão de pagamento
//   StatusParc_Des = 2  -> pago
//   StatusParc_Des = 0  -> a pagar em aberto (IGNORADO de propósito)
//
// Por que não usar controle_pago_insumo_cliente: lá o "a pagar" é
// StatusParc_Des <> 2, ou seja, 0 e 1 somados — não dá para separar. E aquela
// tabela é reescrita pelo robô do NAS, que roda uma cópia antiga do código.
//
// O filtro de insumo casa por PALAVRA porque o UAU tem 10 nomes para a mesma
// família (EMPRESTIMOS, PAGAMENTO DE EMPRESTIMOS, PRINCIPAL DO EMPRÉSTIMO,
// PAGAMENTOS REALIZADOS - EMPRESTIMOS, EMPRESTIMOS CONCEDIDOS, JUROS,
// JUROS E MULTAS - FORNECEDORES, TARIFAS BANCARIAS, TARIFAS TED / PIX,
// CONSORCIO). Nome novo com a mesma palavra entra sozinho.
//
// A consulta leva ~85s. Roda na VM Oracle (o NAS não é tocado).
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
    connectionTimeout: 25000,
    requestTimeout: 300000,
}

const FILTRO_INSUMO = `(
       UPPER(DescInsPl_Des) LIKE '%EMPREST%'
    OR UPPER(DescInsPl_Des) LIKE '%EMPRÉST%'
    OR UPPER(DescInsPl_Des) LIKE '%JURO%'
    OR UPPER(DescInsPl_Des) LIKE '%TARIFA%'
    OR UPPER(DescInsPl_Des) LIKE '%CONSORCIO%'
    OR UPPER(DescInsPl_Des) LIKE '%CONSÓRCIO%'
)`

const query = `
SELECT
    Obra_Des        AS obra,
    DescInsPl_Des   AS descrinsumo,
    NominalProc_Des AS cliente,
    CONVERT(date, DATEADD(day, 1 - DAY(DtPgto_Des), DtPgto_Des)) AS mes,
    SUM(CASE WHEN StatusParc_Des = 1 THEN TotalLiq_Des ELSE 0 END) AS vlr_emissao,
    SUM(CASE WHEN StatusParc_Des = 2 THEN TotalLiq_Des ELSE 0 END) AS vlr_pago,
    COUNT(*) AS qtd
FROM VwDesembolso
WHERE DtPgto_Des BETWEEN '01/01/2023' AND '12/01/2050'
  AND StatusParc_Des IN (1, 2)
  AND ${FILTRO_INSUMO}
GROUP BY
    Obra_Des, DescInsPl_Des, NominalProc_Des,
    CONVERT(date, DATEADD(day, 1 - DAY(DtPgto_Des), DtPgto_Des))
`

const txt = (v: any) => (v == null ? null : v.toString().trim() || null)

function toISODate(d: any): string | null {
    if (!d) return null
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return null
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

async function gravar(rows: any[]) {
    const payload = rows.map(r => ({
        obra: txt(r.obra),
        descrinsumo: txt(r.descrinsumo),
        cliente: txt(r.cliente),
        mes: toISODate(r.mes),
        vlr_emissao: Number(r.vlr_emissao || 0),
        vlr_pago: Number(r.vlr_pago || 0),
        qtd: Number(r.qtd || 0),
    }))

    await supabase.from('emprestimos_encargos').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const CHUNK = 1000
    for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase.from('emprestimos_encargos').insert(payload.slice(i, i + CHUNK))
        if (error) throw new Error('emprestimos_encargos insert: ' + error.message)
    }
    return {
        emissao: payload.reduce((a, p) => a + p.vlr_emissao, 0),
        pago: payload.reduce((a, p) => a + p.vlr_pago, 0),
    }
}

async function ciclo() {
    console.log(`[EMPRESTIMOS] [${new Date().toISOString()}] Iniciando atualização...`)
    let pool: sql.ConnectionPool | null = null
    try {
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const r = await pool.request().query(query)
        const t = await gravar(r.recordset)
        console.log(`[EMPRESTIMOS] OK: ${r.recordset.length} linhas — emissão R$ ${t.emissao.toFixed(2)} | pago R$ ${t.pago.toFixed(2)}`)
    } catch (e: any) {
        console.log(`[EMPRESTIMOS] ERRO: ${(e?.message || e).toString().slice(0, 160)}`)
    } finally {
        if (pool) { try { await pool.close() } catch { /* ignora */ } }
    }
}

process.on('unhandledRejection', (r) => console.log('[EMPRESTIMOS] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[EMPRESTIMOS] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[EMPRESTIMOS] encerrado.'); process.exit(0) })

if (process.env.SYNC_ONCE === '1') {
    ciclo().then(() => process.exit(0))
} else {
    console.log('[EMPRESTIMOS] Worker iniciado — atualiza 3x/dia (09:00, 13:00, 17:30 BRT).')
    agendar(ciclo, 'EMPRESTIMOS')
}
