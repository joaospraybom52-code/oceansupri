/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Worker de ATUALIZAÇÃO do Acompanhamento de Custo (roda no VM Oracle via PM2).
// A cada 5 min, para cada obra:
//   - custo_uau: orçado x realizado por item/serviço/insumo (consulta _665)
//   - custo_materiais: materiais (desembolso) que compõem o custo de cada insumo
// custo_orcamento (Planejado fixo do Excel) NÃO é tocado.
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

const INTERVALO_MS = 5 * 60 * 1000 // 5 min

// Obra -> ano-base (início da janela; fim sempre 2040)
const OBRAS: { obra: string; ano: number }[] = [
    { obra: 'NES10', ano: 2025 },
    { obra: 'NES14', ano: 2025 },
    { obra: 'NES15', ano: 2026 },
    { obra: 'NES16', ano: 2026 },
    { obra: 'NES17', ano: 2026 },
    { obra: 'NES19', ano: 2026 },
    { obra: 'NES20', ano: 2026 },
    { obra: 'NES21', ano: 2025 },
    { obra: 'BF01', ano: 2026 },
]

const PROD = '-3,1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,2008,2010,4006,4009,4010,4031,4041,4043,4044,4045,4048,4065,4066,4067,4068,4069,4070,4071,4072,4073,4074,4076,4078,4080,4081,4082,4083,4084,4086,4087,4088,4091,4096,4097,4098,4100,4102,4103,4104,4105,4106,4108,4109,4111,4112,4113,4114,4115,4116,4117,4127,4128,4129,4130,4131,4132,4133,4134,4135,4136,4137,4138,4139,4140,4141,4142,4143,4144,4145,4146,4147,4148,4149,4150,4151,4152,4153,4154,4155,4156,4157,4158,4159,4160,4161,4162,4163,4164,4165,4166,4167,4168,4169,4170,4171,4172,4173,4174,4175,4176,4177,4178,4179,4180,4181,4182,4183,4294,4295,4382,4383,4384,4385,4386,4387,4388,4389,4390,4391,4392,4393,4394,4395,4396,5007,5008,5009,5010,5011,5012,5013,5014,5015,5016,5017,5018,8001,8002,8003,8004,8005,8006,8007,8008,8009,8010,8011,8012,8013,8014,8015,8016,8017,8018,8019,8020,8021,8022,8023,8024,8025,8026,8027,8028,8029,8030,8031,8032,8033,8034,8035,8036,8037,8038,8039,8040,8041,8042,8043,8044,8045,8046,8047,8048,8049,8050,8051,8052,8053,8054,8055,8056,8057,8058,8059,8060,8061,8062,8063,8064,8065,8066,8067,8068,8069,8070,9000,9001,9002,9003,9004,9005,9006,9007,9008,9009,9010,9011,9012,9013,9014,9015,9016,9017,9018,9019,9020,9021,9022,9023,10000'

const query665 = (obra: string, ano: number) => `
SELECT Empresa_plt, UPPER(CAST(Empresa_Plt AS VARCHAR) + ' - ' + Desc_emp) [Empresa], Obra_plt, UPPER(Obra_Plt + ' - ' + Descr_Obr) [Obra], Prod_plt, Contrato_plt, Item_plt, Serv_plt, COALESCE(Unid_plt, '') [Unid_Plt], COALESCE(Ins_cins, '') [Ins_CIns], UPPER(Descr_plt) [Servico], COALESCE(UPPER(Descr_ins), '') [Insumo], COALESCE(Unid_ins, '') [Unid_Ins],
COALESCE(CASE WHEN(Serv_Plt = '-1') THEN (SELECT SUM(CASE WHEN (Tipo_Ins = 1 OR Tipo_Ins = 2) THEN (Qdade_Pls * Coef_CIns)/ProdEq_Plt ELSE (Qdade_Pls * Coef_CIns) END * Preco_CIns) FROM PlanTotal [PlanT] INNER JOIN PlanServ ON PlanT.Empresa_Plt = PlanServ.Empresa_Pls AND PlanT.Obra_Plt = PlanServ.Obra_Pls AND PlanT.Item_Plt = PlanServ.Item_Pls AND PlanT.Serv_Plt = PlanServ.Serv_Pls AND PlanT.Prod_Plt = PlanServ.Prod_Pls AND PlanT.Contrato_Plt = PlanServ.Contrato_Pls INNER JOIN CompIns ON PlanServ.Empresa_pls = CompIns.Empresa_cins AND PlanServ.Obra_pls = CompIns.Obra_cins AND PlanServ.Item_pls = CompIns.Item_cins AND PlanServ.Mes_pls = CompIns.Mes_cins AND PlanServ.Serv_pls = CompIns.Comp_cins AND PlanServ.Prod_pls = CompIns.Prod_cins AND PlanServ.Contrato_pls = CompIns.Contrato_cins INNER JOIN Insumos ON Empresa_cins = Empresa_ins AND Obra_cins = Obra_ins AND Ins_cins = Cod_ins WHERE Empresa_cins = PlanTotal.Empresa_plt AND Obra_cins = PlanTotal.Obra_plt AND Prod_cins = PlanTotal.Prod_plt AND Contrato_cins = PlanTotal.Contrato_plt AND Item_cins LIKE PlanTotal.Item_plt + '%' AND Mes_cins BETWEEN '01/01/${ano}' AND '01/01/2040') ELSE COALESCE(Valor_cins, 0) END, 0) [ValorPlanej], COALESCE(Valor_cins, 0) [ValorPlanejIns],
CASE WHEN(Serv_plt = '-1') THEN (SELECT COALESCE(SUM(TotalLiq_des), 0) FROM vwDesembolso WHERE Empresa_des = Empresa_plt AND Obra_des = Obra_plt AND ProdutoPL_des = Prod_plt AND ContratoPL_des = Contrato_plt AND ItemPL_des LIKE Item_plt + '%' AND PLMes_des BETWEEN '01/01/${ano}' AND '01/01/2040') ELSE COALESCE(TotalLiq_des, 0) END ValorAprov, COALESCE(TotalLiq_des, 0) [ValorAprovIns],
CASE WHEN(Serv_plt = '-1') THEN (SELECT COALESCE(SUM(ValorVinc_ContPL) - SUM(ValorAprov_ContPL), 0) FROM ContratoPL WHERE Empresa_ContPL = Empresa_plt AND Obra_ContPL = Obra_plt AND Produto_ContPL = Prod_plt AND Contrato_ContPL = Contrato_plt AND Item_ContPL LIKE Item_plt +'%') ELSE COALESCE(SaldoVlrVinc_ContPL, 0) END AS SaldoVlrVinc, COALESCE(SaldoVlrVinc_ContPL, 0) [SaldoVlrVincIns],
CAST('01/01/${ano}' AS DATE) [DataInicial], CAST('01/01/2040' AS DATE) [DataFinal]
FROM PlanTotal
LEFT JOIN (SELECT Empresa_cins, Obra_cins, Prod_cins, Contrato_cins, Item_cins, Comp_cins, Ins_cins, Descr_ins, Unid_ins, SUM(CASE WHEN (Tipo_ins = 1 OR Tipo_ins = 2) THEN (Qdade_pls * Coef_cins)/ProdEq_plt ELSE (Qdade_pls * Coef_cins) END * Preco_cins) [Valor_CIns] FROM PlanTotal INNER JOIN PlanServ ON PlanTotal.Empresa_plt = PlanServ.Empresa_pls AND PlanTotal.Obra_plt = PlanServ.Obra_pls AND PlanTotal.Item_plt = PlanServ.Item_pls AND PlanTotal.Serv_plt = PlanServ.Serv_pls AND PlanTotal.Prod_plt = PlanServ.Prod_pls AND PlanTotal.Contrato_plt = PlanServ.Contrato_pls INNER JOIN CompIns ON PlanServ.Empresa_pls = CompIns.Empresa_cins AND PlanServ.Obra_pls = CompIns.Obra_cins AND PlanServ.Item_pls = CompIns.Item_cins AND PlanServ.Mes_pls = CompIns.Mes_cins AND PlanServ.Serv_pls = CompIns.Comp_cins AND PlanServ.Prod_pls = CompIns.Prod_cins AND PlanServ.Contrato_pls = CompIns.Contrato_cins INNER JOIN Insumos ON Empresa_cins = Empresa_ins AND Obra_cins = Obra_ins AND Ins_cins = Cod_ins INNER JOIN fn_ListEmpObr('4|${obra}', ',') ON Empresa_plt = Empresa AND Obra_plt = Obra WHERE Mes_cins BETWEEN '01/01/${ano}' AND '01/01/2040' AND Prod_cins IN(${PROD}) GROUP BY Empresa_cins, Obra_cins, Prod_cins, Contrato_cins, Item_cins, Comp_cins, Ins_cins, Descr_ins, Unid_Ins) [CompIns] ON Empresa_plt = Empresa_cins AND Obra_plt = Obra_cins AND Prod_plt = Prod_cins AND Contrato_plt = Contrato_cins AND Item_plt = Item_cins AND Serv_plt = Comp_cins
LEFT JOIN (SELECT Empresa_des, Obra_des, ProdutoPL_des, ContratoPL_des, ItemPL_des, CompPL_des, DescCompPL_des, InsumoPL_des, DescInsPL_des, SUM(TotalLiq_des) [TotalLiq_Des] FROM vwDesembolso INNER JOIN fn_ListEmpObr('4|${obra}', ',') ON Empresa_des = Empresa AND Obra_des = Obra WHERE PLMes_des BETWEEN '01/01/${ano}' AND '01/01/2040' AND ProdutoPL_des IN(${PROD}) GROUP BY Empresa_des, Obra_des, ProdutoPL_des, ContratoPL_des, ItemPL_des, CompPL_des, DescCompPL_des, InsumoPL_des, DescInsPL_des) [Desembolso] ON Empresa_plt = Empresa_des AND Obra_plt = Obra_des AND Prod_plt = ProdutoPL_des AND Contrato_plt = ContratoPL_des AND Item_plt = ItemPL_des AND Serv_plt = CompPL_des AND Ins_cins = InsumoPL_des
LEFT JOIN (SELECT Empresa_ContPL, Obra_ContPL, Produto_ContPL, Contrato_ContPL, Item_ContPL, Serv_ContPL, Ins_ContPL, SUM(ValorVinc_ContPL) - SUM(ValorAprov_ContPL) [SaldoVlrVinc_ContPL] FROM ContratoPL INNER JOIN fn_ListEmpObr('4|${obra}', ',') ON Empresa_ContPL = Empresa AND Obra_ContPL = Obra WHERE Produto_ContPL IN(${PROD}) GROUP BY Empresa_ContPL, Obra_ContPL, Produto_ContPL, Contrato_ContPL, Item_ContPL, Serv_ContPL, Ins_ContPL) [ContratoPL] ON Empresa_plt = Empresa_ContPL AND Obra_plt = Obra_ContPL AND Prod_plt = Produto_ContPL AND Contrato_plt = Contrato_ContPL AND Item_plt = Item_ContPL AND Serv_plt = Serv_ContPL AND Ins_cins = Ins_ContPL
INNER JOIN Empresas ON Empresa_plt = Codigo_emp
INNER JOIN Obras ON Empresa_plt = Empresa_obr AND Obra_plt = Cod_obr
INNER JOIN fn_ListEmpObr('4|${obra}', ',') ON Empresa_plt = Empresa AND Obra_plt = Obra
ORDER BY Empresa_plt, Obra_plt, Prod_plt, Contrato_plt, Item_plt, Serv_plt, Ins_cins`

const queryMateriais = (obra: string, ano: number) => `
SELECT Obra_des [obra_plt], ItemPL_des [item_plt], CompPL_des [serv_plt], InsumoPL_des [ins_cins], UPPER(DescInsPL_des) [descr_ins], DescItemProc_Des [material], SUM(TotalLiq_Des) [valor]
FROM vwDesembolso INNER JOIN fn_ListEmpObr('4|${obra}', ',') ON Empresa_des = Empresa AND Obra_des = Obra
WHERE PLMes_des BETWEEN '01/01/${ano}' AND '01/01/2040' AND ProdutoPL_des IN(${PROD}) AND DescItemProc_Des IS NOT NULL
GROUP BY Obra_des, ItemPL_des, CompPL_des, InsumoPL_des, DescInsPL_des, DescItemProc_Des
HAVING SUM(TotalLiq_Des) <> 0
ORDER BY Obra_des, ItemPL_des, SUM(TotalLiq_Des) DESC`

async function gravarCusto(obra: string, rows: any[]) {
    const payload = rows.map((r, i) => ({
        obra_plt: r.Obra_plt, obra: r.Obra, empresa_plt: r.Empresa_plt, prod_plt: r.Prod_plt,
        contrato_plt: r.Contrato_plt, item_plt: r.Item_plt, serv_plt: String(r.Serv_plt), unid_plt: r.Unid_Plt,
        ins_cins: r.Ins_CIns, servico: r.Servico, insumo: r.Insumo, unid_ins: r.Unid_Ins,
        valor_planej: r.ValorPlanej, valor_planej_ins: r.ValorPlanejIns, valor_aprov: r.ValorAprov,
        valor_aprov_ins: r.ValorAprovIns, saldo_vlr_vinc: r.SaldoVlrVinc, saldo_vlr_vinc_ins: r.SaldoVlrVincIns,
        data_inicial: r.DataInicial, data_final: r.DataFinal, ordem: i + 1,
    }))
    await supabase.from('custo_uau').delete().eq('obra_plt', obra)
    if (payload.length) {
        const { error } = await supabase.from('custo_uau').insert(payload)
        if (error) throw new Error('custo_uau insert: ' + error.message)
    }
}

async function gravarMateriais(obra: string, rows: any[]) {
    const payload = rows.map(r => ({
        obra_plt: r.obra_plt, item_plt: r.item_plt, serv_plt: r.serv_plt, ins_cins: String(r.ins_cins ?? ''),
        descr_ins: r.descr_ins, material: r.material, valor: Number(r.valor || 0),
    }))
    await supabase.from('custo_materiais').delete().eq('obra_plt', obra)
    if (payload.length) {
        const { error } = await supabase.from('custo_materiais').insert(payload)
        if (error) throw new Error('custo_materiais insert: ' + error.message)
    }
}

async function cicloObra(obra: string, ano: number) {
    let pool: sql.ConnectionPool | null = null
    try {
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const r665 = await pool.request().query(query665(obra, ano))
        await gravarCusto(obra, r665.recordset)
        const rMat = await pool.request().query(queryMateriais(obra, ano))
        await gravarMateriais(obra, rMat.recordset)
        console.log(`[CUSTO] ${obra}: custo=${r665.recordset.length} | materiais=${rMat.recordset.length} OK`)
        return true
    } catch (e: any) {
        console.log(`[CUSTO] ${obra} ERRO: ${(e?.message || e).toString().slice(0, 80)}`)
        return false
    } finally {
        if (pool) { try { await pool.close() } catch { /* ignora */ } }
    }
}

async function ciclo() {
    console.log(`[CUSTO] [${new Date().toISOString()}] Iniciando atualização das ${OBRAS.length} obras...`)
    let ok = 0
    for (const { obra, ano } of OBRAS) {
        // até 2 tentativas por obra (UAU dá timeout intermitente)
        if (await cicloObra(obra, ano)) ok++
        else if (await cicloObra(obra, ano)) ok++
    }
    console.log(`[CUSTO] Atualização concluída. ${ok}/${OBRAS.length} obras.`)
}

process.on('unhandledRejection', (r) => console.log('[CUSTO] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[CUSTO] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[CUSTO] encerrado.'); process.exit(0) })

async function loop() {
    await ciclo()
    setTimeout(loop, INTERVALO_MS)
}

console.log('[CUSTO] Worker de atualização do Acompanhamento de Custo iniciado.')
loop()
