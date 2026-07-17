/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { agendar } from './schedule'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Worker do Fluxo de Caixa Diário (Painel de Recebimentos do módulo Controle).
// Espelha no Supabase (tabela fluxo_caixa_diario) a consulta de créditos x
// débitos por dia do UAU:
//   - Débito  = vwDesembolso com StatusParc = 2 (pagos), por DtPgto_des;
//   - Crédito = RecebePgto/RecebePgtoDiv com Status_Rpg = 1 (recebimento
//     previsto/prorrogado do cheque), por ProrrogaChq_Rpg.
// Diferenças em relação à medida original do Power BI (validadas):
//   - fn_ListEmpObr(lista fixa de obras) -> filtro Empresa = 4 (não precisa
//     manter lista; obra nova entra sozinha);
//   - UNION -> UNION ALL (os blocos nunca colidem; evita dedup desnecessário);
//   - agregação por (obra, dia, fornecedor) — o suficiente pro gráfico diário
//     e pro tooltip com os fornecedores do dia.
// Roda junto do sync:kpis (SYNC_ONCE=1) ou agendado 3x/dia via agendar().
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

export const queryFluxoCaixa = `
SELECT Obra, DtPgto, Fornecedor, SUM(Credito) AS Credito, SUM(Debito) AS Debito
FROM (
    SELECT Obra_des AS Obra, DtPgto_des AS DtPgto, DescForn_des AS Fornecedor,
           0 AS Credito, SUM(TotalLiq_des) AS Debito
    FROM vwDesembolso
    WHERE Empresa_des = 4
      AND DtPgto_des BETWEEN '20260101' AND '20400101'
      AND StatusParc_des = 2
    GROUP BY Obra_des, DtPgto_des, DescForn_des

    UNION ALL

    SELECT Obra_Rpd, ProrrogaChq_Rpg, Nome_pes,
           SUM(PercentValor_rpd) AS Credito, 0 AS Debito
    FROM RecebePgto
        INNER JOIN RecebePgtoDiv
            ON RecebePgtoDiv.Empresa_Rpd = RecebePgto.Empresa_rpg
            AND RecebePgtoDiv.NumReceb_Rpd = RecebePgto.NumReceb_Rpg
            AND RecebePgtoDiv.TipoRpg_Rpd = RecebePgto.Tipo_Rpg
            AND RecebePgtoDiv.NumCont_Rpd = RecebePgto.NumCont_Rpg
        INNER JOIN VendasRecebidas
            ON RecebePgtoDiv.Empresa_Rpd = VendasRecebidas.Empresa_vrec
            AND RecebePgtoDiv.NumVend_Rpd = VendasRecebidas.Num_VRec
            AND RecebePgtoDiv.Obra_Rpd = VendasRecebidas.Obra_VRec
        INNER JOIN Pessoas
            ON Cliente_rpg = Cod_pes
    WHERE Empresa_Rpd = 4
      AND ProrrogaChq_Rpg BETWEEN '20260101' AND '20400101'
      AND Status_Rpg = 1
    GROUP BY Obra_Rpd, ProrrogaChq_Rpg, Nome_pes
) AS Dados
GROUP BY Obra, DtPgto, Fornecedor
`

function toISODate(d: any): string | null {
    if (!d) return null
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return null
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

async function gravar(rows: any[]) {
    const payload = rows.map(r => ({
        obra: r.Obra != null ? r.Obra.toString().trim() : null,
        data: toISODate(r.DtPgto),
        fornecedor: r.Fornecedor != null ? r.Fornecedor.toString().trim() : null,
        credito: Number(r.Credito || 0),
        debito: Number(r.Debito || 0),
    })).filter(r => r.data && (r.credito !== 0 || r.debito !== 0))

    await supabase.from('fluxo_caixa_diario').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const CHUNK = 1000
    for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase.from('fluxo_caixa_diario').insert(payload.slice(i, i + CHUNK))
        if (error) throw new Error('fluxo_caixa_diario insert: ' + error.message)
    }
    return payload.length
}

async function executarConsulta(): Promise<any[]> {
    let pool: sql.ConnectionPool | null = null
    try {
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const r = await pool.request().query(queryFluxoCaixa)
        return r.recordset
    } finally {
        if (pool) {
            const p = pool
            await Promise.race([
                p.close().catch(() => { }),
                new Promise(res => setTimeout(res, 5000)),
            ])
        }
    }
}

async function ciclo() {
    console.log(`[FLUXO] [${new Date().toISOString()}] Iniciando atualização...`)
    const MAX = 3
    let ultimoErro: any = null
    for (let tent = 1; tent <= MAX; tent++) {
        try {
            const rows = await executarConsulta()
            const n = await gravar(rows)
            console.log(`[FLUXO] OK: ${rows.length} lidas, ${n} gravadas em fluxo_caixa_diario.`)
            return
        } catch (e: any) {
            ultimoErro = e
            console.log(`[FLUXO] tentativa ${tent}/${MAX} falhou: ${(e?.message || e).toString().slice(0, 150)}`)
            if (tent < MAX) await new Promise(res => setTimeout(res, 8000))
        }
    }
    throw new Error(`[FLUXO] falhou após ${MAX} tentativas: ${(ultimoErro?.message || ultimoErro).toString().slice(0, 150)}`)
}

process.on('unhandledRejection', (r) => console.log('[FLUXO] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[FLUXO] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[FLUXO] encerrado.'); process.exit(0) })

const isMain = (() => {
    try { return import.meta.url === new URL(`file://${process.argv[1]}`).href || process.argv[1]?.includes('sync-fluxo-caixa') }
    catch { return true }
})()
if (isMain) {
    console.log('[FLUXO] Worker do Fluxo de Caixa Diário iniciado.')
    agendar(ciclo, 'FLUXO')
}
