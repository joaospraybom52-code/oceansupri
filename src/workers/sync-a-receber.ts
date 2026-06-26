/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Worker do módulo Controle / aba KPI'S (roda no NAS via PM2).
// A cada 5 min espelha a consulta "A_receber" do UAU na tabela controle_a_receber.
// Versão enxuta da query original (validada: dá o mesmo resultado da medida que a
// query completa). Grão por parcela, dedup via DISTINCT na chave da parcela.
// Card "Faturado a Receber" = SUM(ValProvisaoCurto_Ven)+SUM(ValDescontoImposto_ven)
// onde NumParcGer_Prc = '1'.
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
    requestTimeout: 180000,
}

const INTERVALO_MS = 10 * 60 * 1000 // 10 min

const queryAReceber = `
SELECT DISTINCT cr.Obra_Prc, cr.Data_Prc, cr.NumParcGer_Prc, cr.NumVend_Prc, cr.NumParc_Prc, cr.Tipo_Prc,
       v.ValProvisaoCurto_Ven, v.ValDescontoImposto_ven,
       cr.Valor_Prc, v.DataFimContrato_Ven, v.HistLanc_Ven, v.Data_Ven
FROM VwContasReceberBoleto cr
INNER JOIN Vendas v WITH(NOLOCK) ON v.Empresa_Ven = cr.Empresa_Prc AND v.Obra_Ven = cr.Obra_Prc AND v.Num_Ven = cr.NumVend_Prc
INNER JOIN Parcelas p WITH(NOLOCK) ON p.Tipo_par = cr.Tipo_Prc
WHERE v.TipoVenda_Ven IN (0,1,2,3,4,5)
`

function toISODate(d: any): string | null {
    if (!d) return null
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return null
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

async function gravarAReceber(rows: any[]) {
    const payload = rows.map(r => ({
        obra: r.Obra_Prc?.toString().trim() ?? null,
        data_prc: toISODate(r.Data_Prc),
        num_parc_ger: r.NumParcGer_Prc != null ? r.NumParcGer_Prc.toString().trim() : null,
        val_provisao_curto_ven: Number(r.ValProvisaoCurto_Ven || 0),
        val_desconto_imposto_ven: Number(r.ValDescontoImposto_ven || 0),
        valor_prc: Number(r.Valor_Prc || 0),
        data_fim_contrato_ven: toISODate(r.DataFimContrato_Ven),
        hist_lanc_ven: r.HistLanc_Ven != null ? r.HistLanc_Ven.toString() : null,
        data_ven: toISODate(r.Data_Ven),
    }))

    await supabase.from('controle_a_receber').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const CHUNK = 1000
    for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase.from('controle_a_receber').insert(payload.slice(i, i + CHUNK))
        if (error) throw new Error('controle_a_receber insert: ' + error.message)
    }
}

async function ciclo() {
    console.log(`[ARECEBER] [${new Date().toISOString()}] Iniciando atualização...`)
    let pool: sql.ConnectionPool | null = null
    try {
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const r = await pool.request().query(queryAReceber)
        await gravarAReceber(r.recordset)
        console.log(`[ARECEBER] OK: ${r.recordset.length} parcelas espelhadas.`)
    } catch (e: any) {
        console.log(`[ARECEBER] ERRO: ${(e?.message || e).toString().slice(0, 120)}`)
    } finally {
        if (pool) { try { await pool.close() } catch { /* ignora */ } }
    }
}

process.on('unhandledRejection', (r) => console.log('[ARECEBER] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[ARECEBER] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[ARECEBER] encerrado.'); process.exit(0) })

async function loop() {
    await ciclo()
    setTimeout(loop, INTERVALO_MS)
}

console.log('[ARECEBER] Worker de atualização do A Receber (KPI Controle) iniciado.')
loop()
