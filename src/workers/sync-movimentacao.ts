/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { agendar } from './schedule'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Movimentação financeira do UAU -> tabela movimentacao_financeira.
// É a fonte da aba DRE Gerencial (módulo Controle).
//
// Adaptado da consulta de Movimentação do usuário, mantendo só os blocos que a
// DRE usa (os dois descartados são justamente os mais pesados):
//   CONTAS PAGAS       (vwDesembolso, StatusParc_Des = 2)   -> custo, valor NEGATIVO
//   CONTROLE FINANCEIRO(EntSaiEmpAplic)                     -> ± conforme EntSai_Es
//   TRANSFERÊNCIA      (TransfBco, lados débito e crédito)  -> − no débito, + no crédito
//   RECEBIDAS          (Recebidas)                          -> receita, valor POSITIVO
// Fora: "contas a pagar" (custo é só o pago) e "contas a receber" (a receita da
// DRE vem de RECEBIDAS).
//
// Escopo: empresa 4 e as 15 contas do Fechamento Banco (14 + Santander
// 13003997-7). O filtro é pela CONTA, não pelo número do banco — assim não entra
// conta de fora que por acaso seja do mesmo banco.
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
    requestTimeout: 600000,
}

const EMPRESA = 4
const INICIO = process.env.MOV_INICIO || '2025-01-01'
const FIM = '2050-01-01'

/** As 15 contas do Fechamento Banco (14 + Santander STD FELICIO). */
const CONTAS = [
    '10744-G', '10744-X', '10745-G', '10745-X',
    '13003997-7',
    '580256669-4',
    '99302-7', '99458-7', '99678-0', '99718-4', '99754-9',
    '581506-4', '581508-1',
    '127859-2', '127859-G',
]
const LISTA_CONTAS = CONTAS.map(c => `'${c}'`).join(',')

const query = `
-- 1) CONTAS PAGAS (saída)
SELECT
    d.Empresa_Des                         AS empresa,
    d.Obra_Des                            AS obra,
    UPPER(o.Descr_Obr)                    AS desc_obra,
    d.DescCompPl_Des                      AS descr_comp,
    UPPER(ISNULL(pes.Nome_Pes, d.NominalProc_Des)) AS nominal,
    UPPER(ISNULL(forn.Nome_Pes, ''))      AS fornecedor,
    -SUM(d.TotalLiq_Des)                  AS valor,
    d.Banco_Des                           AS banco,
    cc.Agencia_Banco                      AS agencia,
    d.ContaCorr_Des                       AS conta,
    d.DtPgto_Des                          AS emissao,
    t.DataVencParc_Pag                    AS vencimento,
    'CONTAS PAGAS'                        AS origem,
    cmf.Codigo_Cmf + ' - ' + cmf.Desc_Cmf AS natureza,
    CAST(d.DocFiscal_Des AS VARCHAR)      AS nf,
    CAST(t.NumProc_Pag AS VARCHAR)        AS processo
FROM vwDesembolso d WITH(NOLOCK)
INNER JOIN (
    SELECT DISTINCT NumProc_Pag, Empresa_Pag, NumParc_Pag, ObraProc_Pag, DataVencParc_Pag, CategMovFin_Pag
    FROM ContasPagas WITH(NOLOCK)
) t ON d.Empresa_Des = t.Empresa_Pag AND d.NumProc_Des = t.NumProc_Pag
   AND d.Obra_Des = t.ObraProc_Pag AND d.NumParc_Des = t.NumParc_Pag
LEFT JOIN CCorrente cc WITH(NOLOCK) ON d.Empresa_Des = cc.Empresa_Banco AND d.Banco_Des = cc.Numero_Banco AND d.ContaCorr_Des = cc.Conta_Banco
LEFT JOIN CategoriasDeMovFin cmf WITH(NOLOCK) ON t.CategMovFin_Pag = cmf.Codigo_Cmf
LEFT JOIN Obras o WITH(NOLOCK) ON o.Empresa_Obr = d.Empresa_Des AND o.Cod_Obr = d.Obra_Des
LEFT JOIN Pessoas pes WITH(NOLOCK) ON CASE WHEN ISNUMERIC(d.NominalProc_Des) = 1 THEN CAST(d.NominalProc_Des AS BIGINT) END = pes.Cod_Pes
LEFT JOIN Pessoas forn WITH(NOLOCK) ON d.CodForn_Des = forn.Cod_Pes
WHERE d.Empresa_Des = ${EMPRESA} AND d.StatusParc_Des = 2
  AND d.DtPgto_Des BETWEEN '${INICIO}' AND '${FIM}'
  AND d.ContaCorr_Des IN (${LISTA_CONTAS})
GROUP BY d.Empresa_Des, d.Obra_Des, o.Descr_Obr, d.DescCompPl_Des, d.NominalProc_Des, pes.Nome_Pes, forn.Nome_Pes,
         d.Banco_Des, cc.Agencia_Banco, d.ContaCorr_Des, d.DtPgto_Des, t.DataVencParc_Pag,
         cmf.Codigo_Cmf, cmf.Desc_Cmf, d.DocFiscal_Des, t.NumProc_Pag

UNION ALL
-- 2) CONTROLE FINANCEIRO (entrada + / saída -)
SELECT e.Empresa_Es, e.Obra_Es, UPPER(o.Descr_Obr), '', UPPER(LTRIM(RTRIM(e.HistLanc_Es))), '',
       CASE e.EntSai_Es WHEN 0 THEN 1 ELSE -1 END * e.Valor_Es,
       e.Banco_Es, cc.Agencia_Banco, e.Conta_Es, e.Data_Es, e.Data_Es,
       'CONTROLE FINANCEIRO', '', e.NumDoc_Es, ''
FROM EntSaiEmpAplic e WITH(NOLOCK)
INNER JOIN CCorrente cc WITH(NOLOCK) ON e.Empresa_Es = cc.Empresa_Banco AND e.Conta_Es = cc.Conta_Banco AND e.Banco_Es = cc.Numero_Banco
LEFT JOIN Obras o WITH(NOLOCK) ON o.Empresa_Obr = e.Empresa_Es AND o.Cod_Obr = e.Obra_Es
WHERE e.Empresa_Es = ${EMPRESA} AND e.Data_Es BETWEEN '${INICIO}' AND '${FIM}'
  AND e.Conta_Es IN (${LISTA_CONTAS})

UNION ALL
-- 3) TRANSFERÊNCIA — lado do débito (sai)
SELECT tb.Empresa_Tb, 'DIVERSAS', 'DIVERSAS', '', UPPER(LTRIM(RTRIM(tb.HistLanc_Tb))), '',
       -tb.Valor_Tb, tb.BcoDeb_Tb, cc.Agencia_Banco, tb.ContaDeb_Tb, tb.Data_Tb, tb.Data_Tb,
       'TRANSFERÊNCIA', '', tb.NumDoc_Tb, ''
FROM TransfBco tb WITH(NOLOCK)
INNER JOIN CCorrente cc WITH(NOLOCK) ON tb.Empresa_Tb = cc.Empresa_Banco AND tb.ContaDeb_Tb = cc.Conta_Banco AND tb.BcoDeb_Tb = cc.Numero_Banco
WHERE tb.Empresa_Tb = ${EMPRESA} AND tb.Data_Tb BETWEEN '${INICIO}' AND '${FIM}'
  AND tb.ContaDeb_Tb IN (${LISTA_CONTAS})

UNION ALL
-- 4) TRANSFERÊNCIA — lado do crédito (entra)
SELECT tb.Empresa_Tb, 'DIVERSAS', 'DIVERSAS', '', UPPER(LTRIM(RTRIM(tb.HistLanc_Tb))), '',
       tb.Valor_Tb, tb.BcoCred_Tb, cc.Agencia_Banco, tb.ContaCred_Tb, tb.Data_Tb, tb.Data_Tb,
       'TRANSFERÊNCIA', '', tb.NumDoc_Tb, ''
FROM TransfBco tb WITH(NOLOCK)
INNER JOIN CCorrente cc WITH(NOLOCK) ON tb.Empresa_Tb = cc.Empresa_Banco AND tb.ContaCred_Tb = cc.Conta_Banco AND tb.BcoCred_Tb = cc.Numero_Banco
WHERE tb.Empresa_Tb = ${EMPRESA} AND tb.Data_Tb BETWEEN '${INICIO}' AND '${FIM}'
  AND tb.ContaCred_Tb IN (${LISTA_CONTAS})

UNION ALL
-- 5) RECEBIDAS (receita)
SELECT r.Empresa_Rec, r.Obra_Rec, UPPER(o.Descr_Obr), '',
       UPPER(ISNULL(cli.Nome_Pes, CAST(r.Cliente_Rec AS VARCHAR))), '',
       SUM(rpd.PercentValor_Rpd),
       rpg.BancoDep_Rpg, rpg.AgenciaDep_Rpg, rpg.ContaDep_Rpg, r.Data_Rec, r.DataVenci_Rec,
       'RECEBIDAS', '', '', CAST(r.NumVend_Rec AS VARCHAR) + '-' + CAST(r.NumParc_Rec AS VARCHAR)
FROM Recebidas r WITH(NOLOCK)
INNER JOIN RecebePgtoDiv rpd WITH(NOLOCK)
    ON r.Empresa_Rec = rpd.Empresa_Rpd AND r.NumVend_Rec = rpd.NumVend_Rpd AND r.Obra_Rec = rpd.Obra_Rpd
   AND r.NumParc_Rec = rpd.NumParc_Rpd AND r.ParcType_Rec = rpd.ParcType_Rpd AND r.Tipo_Rec = rpd.Tipo_Rpd
   AND r.NumParcGer_Rec = rpd.NumParcGer_Rpd
INNER JOIN RecebePgto rpg WITH(NOLOCK)
    ON rpd.Empresa_Rpd = rpg.Empresa_Rpg AND rpd.NumReceb_Rpd = rpg.NumReceb_Rpg
   AND rpd.NumCont_Rpd = rpg.NumCont_Rpg AND rpd.TipoRpg_Rpd = rpg.Tipo_Rpg
LEFT JOIN Obras o WITH(NOLOCK) ON o.Empresa_Obr = r.Empresa_Rec AND o.Cod_Obr = r.Obra_Rec
LEFT JOIN Pessoas cli WITH(NOLOCK) ON r.Cliente_Rec = cli.Cod_Pes
WHERE r.Empresa_Rec = ${EMPRESA} AND r.Data_Rec BETWEEN '${INICIO}' AND '${FIM}'
  AND rpg.ContaDep_Rpg IN (${LISTA_CONTAS})
GROUP BY r.Empresa_Rec, r.Obra_Rec, o.Descr_Obr, r.Cliente_Rec, cli.Nome_Pes,
         rpg.BancoDep_Rpg, rpg.AgenciaDep_Rpg, rpg.ContaDep_Rpg, r.Data_Rec, r.DataVenci_Rec,
         r.NumVend_Rec, r.NumParc_Rec
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
        empresa: r.empresa != null ? Number(r.empresa) : null,
        obra: txt(r.obra),
        desc_obra: txt(r.desc_obra),
        descr_comp: txt(r.descr_comp),
        nominal: txt(r.nominal),
        fornecedor: txt(r.fornecedor),
        valor: Number(r.valor || 0),
        banco: r.banco != null ? Number(r.banco) : null,
        agencia: txt(r.agencia),
        conta: txt(r.conta),
        emissao: toISODate(r.emissao),
        // sem vencimento (controle financeiro/transferência) cai na data do lançamento
        vencimento: toISODate(r.vencimento) ?? toISODate(r.emissao),
        origem: txt(r.origem),
        natureza: txt(r.natureza),
        nf: txt(r.nf),
        processo: txt(r.processo),
    }))

    await supabase.from('movimentacao_financeira').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const CHUNK = 1000
    for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase.from('movimentacao_financeira').insert(payload.slice(i, i + CHUNK))
        if (error) throw new Error('movimentacao_financeira insert: ' + error.message)
    }

    // Resumo por origem, pra conferir no log
    const porOrigem = new Map<string, { n: number; v: number }>()
    for (const p of payload) {
        const k = p.origem || '?'
        const cur = porOrigem.get(k) ?? { n: 0, v: 0 }
        cur.n++; cur.v += p.valor || 0
        porOrigem.set(k, cur)
    }
    return porOrigem
}

async function ciclo() {
    console.log(`[MOV] [${new Date().toISOString()}] Iniciando atualização...`)
    let pool: sql.ConnectionPool | null = null
    try {
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const r = await pool.request().query(query)
        const resumo = await gravar(r.recordset)
        console.log(`[MOV] OK: ${r.recordset.length} lançamentos espelhados.`)
        for (const [origem, x] of resumo) {
            console.log(`[MOV]   ${origem.padEnd(20)} ${String(x.n).padStart(6)} linhas  R$ ${x.v.toFixed(2)}`)
        }
    } catch (e: any) {
        console.log(`[MOV] ERRO: ${(e?.message || e).toString().slice(0, 200)}`)
    } finally {
        if (pool) { try { await pool.close() } catch { /* ignora */ } }
    }
}

process.on('unhandledRejection', (r) => console.log('[MOV] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[MOV] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[MOV] encerrado.'); process.exit(0) })

if (process.env.SYNC_ONCE === '1') {
    ciclo().then(() => process.exit(0)).catch(() => process.exit(1))
} else {
    console.log('[MOV] Worker iniciado — atualiza 3x/dia (09:00, 13:00, 17:30 BRT).')
    agendar(ciclo, 'MOV')
}
