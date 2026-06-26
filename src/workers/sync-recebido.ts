/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { agendar } from './schedule'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Worker do módulo Controle / aba KPI'S (roda no NAS via PM2).
// A cada 5 min espelha a consulta "recebido" do UAU na tabela controle_recebido
// do Supabase, guardando apenas: obra_rec, tot_conf (Total Recebido Real) e
// data_rec. Filtros replicados do Power BI: DtIdxParc_Rec > 30/11/2024 e
// Obra_Rec <> 'DP'.
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


// Consulta "recebido" (idêntica à do Power BI). Mantemos a query completa como
// subconsulta e, no nível externo, projetamos só as 3 colunas que a tabela
// espelho guarda, aplicando os mesmos filtros do Power Query.
const queryRecebido = `
SELECT R.Obra_Rec, R.TotConf, R.Data_Rec, R.TotDesc, R.TotPrinc
FROM (
    -- Uma linha por parcela recebida (sem DISTINCT: não colapsa parcelas
    -- distintas que tenham o mesmo valor/obra/data).
    SELECT *
    FROM (
        SELECT
            ((Recebidas.ValorConf_Rec + Recebidas.VlJurosParcConf_Rec + Recebidas.VlCorrecaoConf_Rec + Recebidas.VlAcresConf_Rec + Recebidas.VlTaxaBolConf_Rec + Recebidas.VlMultaConf_Rec + Recebidas.VlJurosConf_Rec + Recebidas.VlCorrecaoAtrConf_Rec)
            -
            (Recebidas.VlDescontoConf_Rec + Recebidas.ValDescontoCustaConf_Rec + Recebidas.ValDescontoImpostoConf_Rec + Recebidas.ValDescontoCondicionalConf_rec)) AS TotConf,

            ((Recebidas.VlDesconto_Rec + Recebidas.VlDescontoConf_Rec) + (Recebidas.ValDescontoCondicional_rec + Recebidas.ValDescontoCondicionalConf_rec)) AS TotDesc,
            (Recebidas.Valor_Rec + Recebidas.ValorConf_Rec) AS TotPrinc,

            Recebidas.Obra_Rec, Recebidas.Data_Rec, Recebidas.DtIdxParc_Rec

        FROM VendasRecebidas WITH(NOLOCK)
        INNER JOIN Recebidas WITH(NOLOCK)
            ON VendasRecebidas.Empresa_VRec = Recebidas.Empresa_Rec
            AND VendasRecebidas.Obra_VRec = Recebidas.Obra_Rec
            AND VendasRecebidas.Num_VRec = Recebidas.NumVend_Rec
        INNER JOIN Obras WITH(NOLOCK)
            ON VendasRecebidas.Empresa_vrec = Obras.Empresa_obr AND VendasRecebidas.Obra_VRec = Obras.cod_obr
        INNER JOIN TipoVenc WITH(NOLOCK)
            ON Recebidas.ComoParc_Rec = TipoVenc.cod_tv
        INNER JOIN Indices WITH(NOLOCK)
            ON Recebidas.IdxReaj_Rec = Indices.Cod_idx
        INNER JOIN Pessoas WITH(NOLOCK)
            ON Pessoas.Cod_pes = Recebidas.Cliente_Rec
        INNER JOIN Empresas WITH(NOLOCK)
            ON Empresas.Codigo_emp = VendasRecebidas.Empresa_vrec
        WHERE (VendasRecebidas.TipoVenda_VRec IN (0,1,2,3,4,5))
    ) AS Recebidas
) AS R
WHERE R.DtIdxParc_Rec > '2024-11-30' AND R.Obra_Rec <> 'DP'
`

function toISODate(d: any): string | null {
    if (!d) return null
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return null
    // Usa componentes UTC para não deslocar o dia por fuso.
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

async function gravarRecebido(rows: any[]) {
    const payload = rows.map(r => ({
        obra_rec: r.Obra_Rec?.toString().trim() ?? null,
        tot_conf: Number(r.TotConf || 0),
        data_rec: toISODate(r.Data_Rec),
        tot_desc: Number(r.TotDesc || 0),
        tot_princ: Number(r.TotPrinc || 0),
    }))

    // Refresh completo: apaga tudo e reinsere.
    await supabase.from('controle_recebido').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const CHUNK = 1000
    for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase.from('controle_recebido').insert(payload.slice(i, i + CHUNK))
        if (error) throw new Error('controle_recebido insert: ' + error.message)
    }
}

async function ciclo() {
    console.log(`[RECEBIDO] [${new Date().toISOString()}] Iniciando atualização...`)
    let pool: sql.ConnectionPool | null = null
    try {
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const r = await pool.request().query(queryRecebido)
        await gravarRecebido(r.recordset)
        console.log(`[RECEBIDO] OK: ${r.recordset.length} parcelas espelhadas.`)
    } catch (e: any) {
        console.log(`[RECEBIDO] ERRO: ${(e?.message || e).toString().slice(0, 120)}`)
    } finally {
        if (pool) { try { await pool.close() } catch { /* ignora */ } }
    }
}

process.on('unhandledRejection', (r) => console.log('[RECEBIDO] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[RECEBIDO] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[RECEBIDO] encerrado.'); process.exit(0) })

console.log('[RECEBIDO] Worker iniciado — atualiza 3x/dia (09:00, 13:00, 17:30 BRT).')
agendar(ciclo, 'RECEBIDO')
