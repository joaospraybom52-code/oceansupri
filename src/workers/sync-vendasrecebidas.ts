/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { agendar } from './schedule'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Worker do módulo Controle / aba KPI'S (roda no NAS via PM2).
// A cada 5 min espelha a tabela "vendasrecebidas" do UAU na tabela
// controle_vendasrecebidas. Guarda só as colunas usadas no card "Valor Recebido
// Bruto" (via TREATAS com recebido[TotPrinc]).
// Filtros do Power Query: Data_VRec > 2024-11-30 e Obra_VRec <> 'DP'.
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


const queryVendas = `
SELECT Obra_VRec, Data_VRec, ValProvisaoCurto_Vrec, ValDescontoImposto_vrec
FROM VendasRecebidas WITH(NOLOCK)
WHERE Data_VRec > '2024-11-30' AND Obra_VRec <> 'DP'
`

function toISODate(d: any): string | null {
    if (!d) return null
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return null
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

async function gravarVendas(rows: any[]) {
    const payload = rows.map(r => ({
        obra_vrec: r.Obra_VRec?.toString().trim() ?? null,
        data_vrec: toISODate(r.Data_VRec),
        val_provisao_curto_vrec: Number(r.ValProvisaoCurto_Vrec || 0),
        val_desconto_imposto_vrec: Number(r.ValDescontoImposto_vrec || 0),
    }))

    await supabase.from('controle_vendasrecebidas').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const CHUNK = 1000
    for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase.from('controle_vendasrecebidas').insert(payload.slice(i, i + CHUNK))
        if (error) throw new Error('controle_vendasrecebidas insert: ' + error.message)
    }
}

async function ciclo() {
    console.log(`[VENDASREC] [${new Date().toISOString()}] Iniciando atualização...`)
    let pool: sql.ConnectionPool | null = null
    try {
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const r = await pool.request().query(queryVendas)
        await gravarVendas(r.recordset)
        console.log(`[VENDASREC] OK: ${r.recordset.length} vendas espelhadas.`)
    } catch (e: any) {
        console.log(`[VENDASREC] ERRO: ${(e?.message || e).toString().slice(0, 120)}`)
    } finally {
        if (pool) { try { await pool.close() } catch { /* ignora */ } }
    }
}

process.on('unhandledRejection', (r) => console.log('[VENDASREC] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[VENDASREC] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[VENDASREC] encerrado.'); process.exit(0) })

console.log('[VENDASREC] Worker iniciado — atualiza 3x/dia (09:00, 13:00, 17:30 BRT).')
agendar(ciclo, 'VENDASREC')
