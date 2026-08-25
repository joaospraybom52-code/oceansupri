/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { agendar } from './schedule'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Worker das CONTAS A PAGAR (módulo Controle).
// Espelha na tabela contas_a_pagar as parcelas já EMITIDAS aguardando débito,
// somando as DUAS medidas de débito do usuário (mesma consulta, muda o tipo):
//   StatusParc_proc = 1 AND TipoChq_Proc IN ('Débito Eletrônico', 'Débito C/C')
// Escopo: obras do usuário UAU J.LUCAS com status_obr < 1 ou = 3, excluindo as
// contas bancárias restritas a ele.
//
// Mapa das colunas (definido pelo usuário):
//   obra           = Obra_Proc            nominal   = ChqNome_Proc
//   valor          = (ValorParc + Acresc) - Desc
//   conta          = Conta_Proc           obs       = ObsPag_Proc
//   data (fluxo)   = DtPagParc_Proc  -> PRORROGAÇÃO
//   parcela/total  = NumParc_Proc / QtdeParcelas_ProcPar
//
// Alimenta o "A pagar" do Fluxo de Caixa Diário e as linhas PAGAR do relatório
// Fluxo de Caixa (Fechamento Banco).
// (Substituiu a régua antiga: StatusParc = 0 + Conf_Proc = 'DVQ'.)
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

const USUARIO_UAU = 'J.LUCAS'

const queryAPagar = `
SELECT d.Empresa_proc,
       d.Obra_Proc,
       p.Num_Proc,
       p.NumParc_Proc,
       par.QtdeParcelas_ProcPar,
       p.banContParc_proc,
       p.Conta_Proc,
       p.ChqNome_Proc          AS Nominal,
       p.ObsPag_Proc,
       p.DtPagParc_Proc,       -- PRORROGAÇÃO: a data que vale no fluxo
       p.DtVencParc_Proc,      -- vencimento original (referência)
       p.TipoChq_Proc,
       ((p.ValorParc_Proc + p.AcrescParc_Proc) - p.DescParc_Proc) AS ValPagar_proc
FROM Parc_Proc p WITH(NOLOCK)
INNER JOIN Dados_Proc d WITH(NOLOCK)
    ON d.Empresa_proc = p.Empresa_proc AND d.Num_Proc = p.Num_Proc AND d.Obra_Proc = p.Obra_Proc
INNER JOIN (
    SELECT o.Emp_uo AS Empresa, o.Obr_uo AS Obra
    FROM OBRUSR o
    INNER JOIN Obras ob WITH(NOLOCK) ON o.obr_uo = ob.cod_obr AND o.emp_uo = ob.empresa_obr
    WHERE o.Usr_uo = '${USUARIO_UAU}' AND (ob.status_obr < 1 OR ob.status_obr = 3)
) e ON d.Empresa_proc = e.Empresa AND d.Obra_Proc = e.Obra
LEFT JOIN DadosProcParam par WITH(NOLOCK)
    ON par.Empresa_ProcPar = d.Empresa_proc AND par.NumProc_ProcPar = d.Num_Proc AND par.Obra_ProcPar = d.Obra_Proc
WHERE p.StatusParc_proc = 1
  AND p.TipoChq_Proc IN ('Débito Eletrônico', 'Débito C/C')
  AND NOT EXISTS (
        SELECT 1 FROM BancoContaUsuarios b WITH(NOLOCK)
        WHERE b.Usuario_BcoCont = '${USUARIO_UAU}'
          AND p.Empresa_proc = b.Empresa_BcoCont
          AND p.banContParc_proc = b.Banco_BcoCont
          AND p.Conta_Proc = b.Conta_BcoCont)
`


function toISODate(d: any): string | null {
    if (!d) return null
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return null
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

const txt = (v: any) => (v == null ? null : v.toString().trim() || null)

async function gravar(rows: any[]) {
    const payload = rows.map(r => ({
        empresa: r.Empresa_proc != null ? Number(r.Empresa_proc) : null,
        obra: txt(r.Obra_Proc),
        num_proc: r.Num_Proc != null ? Number(r.Num_Proc) : null,
        num_parc: r.NumParc_Proc != null ? Number(r.NumParc_Proc) : null,
        total_parcelas: r.QtdeParcelas_ProcPar != null ? Number(r.QtdeParcelas_ProcPar) : null,
        banco: r.banContParc_proc != null ? Number(r.banContParc_proc) : null,
        conta: txt(r.Conta_Proc),
        fornecedor: txt(r.Nominal),
        obs_pag: txt(r.ObsPag_Proc),
        data_pagamento: toISODate(r.DtPagParc_Proc),
        vencimento: toISODate(r.DtVencParc_Proc),
        tipo_pagamento: txt(r.TipoChq_Proc),
        valor: Number(r.ValPagar_proc || 0),
    }))

    await supabase.from('contas_a_pagar').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const CHUNK = 1000
    for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase.from('contas_a_pagar').insert(payload.slice(i, i + CHUNK))
        if (error) throw new Error('contas_a_pagar insert: ' + error.message)
    }
    return payload.reduce((a, p) => a + (p.valor || 0), 0)
}

async function ciclo() {
    console.log(`[APAGAR] [${new Date().toISOString()}] Iniciando atualização...`)
    let pool: sql.ConnectionPool | null = null
    try {
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const r = await pool.request().query(queryAPagar)
        const total = await gravar(r.recordset)
        console.log(`[APAGAR] OK: ${r.recordset.length} parcelas em débito — total R$ ${total.toFixed(2)}`)
    } catch (e: any) {
        console.log(`[APAGAR] ERRO: ${(e?.message || e).toString().slice(0, 160)}`)
    } finally {
        if (pool) { try { await pool.close() } catch { /* ignora */ } }
    }
}

process.on('unhandledRejection', (r) => console.log('[APAGAR] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[APAGAR] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[APAGAR] encerrado.'); process.exit(0) })

if (process.env.SYNC_ONCE === '1') {
    ciclo().then(() => process.exit(0))
} else {
    console.log('[APAGAR] Worker iniciado — atualiza 3x/dia (09:00, 13:00, 17:30 BRT).')
    agendar(ciclo, 'APAGAR')
}
