/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Worker do módulo Controle / aba KPI'S (roda no NAS via PM2).
// A cada 5 min espelha a consulta "PAGO_E_APAGAR" do UAU na tabela
// controle_pago_apagar. Roda a query verbatim (idêntica ao Power BI, inclusive
// o bloco IF 1=0...ELSE) e, no JS, aplica os mesmos filtros do Power Query e
// projeta só as colunas usadas pelos cards.
// Filtros do Power Query replicados: EmpresaResultado = '4 - CONSTROWINS...',
// Obra <> null e Obra <> 'DP'.
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

const INTERVALO_MS = 10 * 60 * 1000 // 10 min

const EMPRESA_CONSTROWINS = '4 - CONSTROWINS SERVIÇOS DE ENGENHARIA LTDA'

// Query "PAGO_E_APAGAR" verbatim (a mesma do Power BI). O bloco IF 1=0 fica
// inativo; o bloco ELSE é o que executa (data de conciliação/pagamento).
export const queryPagoApagar = `
IF 1 = 0
BEGIN
    SELECT 1 AS Vazio
END
ELSE
BEGIN
    SELECT
        UPPER(CAST(Cod_Emp AS VARCHAR) + ' - ' + Desc_Emp) [EmpresaResultado],
        UPPER(CAST(ISNULL(Obra, '') AS VARCHAR) + ' - '+  Descr_Obr) [ObraResultado],
        UPPER(Descr_Plt) [DescrItemPai],
        Demonstrativo.*
    FROM (
        SELECT
            Empresa_Des [Cod_Emp],
            Obra_Des [Obra],
            CAST(ItemProc_Des AS VARCHAR) + ' - ' + DescItemProc_Des [Item],
            InsumoPl_Des [Insumo],
            CompPl_Des [Servico],
            DescInsPl_Des [DescrInsumo],
            DescCompPl_Des [DescrServico],
            CAST(NumProc_Des AS VARCHAR) + '/' + CAST(NumParc_Des AS VARCHAR) [NumProcesso],
            CAST(DocFiscal_Des AS VARCHAR) [DocFiscal],
            ISNULL(Data_Doc, DtPgto_Des) [DataMovimento],
            SUM(CASE WHEN StatusParc_Des <> 2 THEN TotalLiq_Des ELSE 0 END) [VlrAtPagar],
            SUM(CASE WHEN StatusParc_Des <> 2 THEN 0 ELSE TotalLiq_Des END) [VlrAtPago],
            SUM(TotalLiq_Des) [VlrComp],
            NominalProc_Des [Cliente],
            Banco_Des,
            ContaCorr_Des,
            ProdutoPl_Des [Produto],
            SUM(TotalLiq_Des) [TotalReceita],
            'Despesas' [TipoControle],
            'D' [Tipo],
            ItemPl_Des,
            CASE CHARINDEX('.', ItemPl_Des) WHEN 0 THEN ItemPl_Des ELSE LEFT(ItemPl_Des, CHARINDEX('.', ItemPl_Des) - 1) END [ItemPlPai],
            Desembolso.QtdeItem_Des,
            Desembolso.ValorUnitItem_Des,
            Desembolso.UnidItemProc_Des,
            Composicoes.Unid_Comp,
            ISNULL(Insumos.Unid_Ins, InsumosGeral.Unid_Ins) [Unid_Ins],
            Desembolso.ContratoPl_Des [ContratoPL]
        FROM (
            SELECT VwDesembolso.*
            FROM VwDesembolso
            WHERE DescInsPl_Des LIKE '%' AND DtPgto_Des BETWEEN '01/01/2023' AND '12/01/2050'
        ) [Desembolso]
        LEFT JOIN (
            SELECT * FROM Extrato
            WHERE Data_Doc BETWEEN '01/01/2023' AND '12/01/2050'
        ) [Extrato] ON Empresa_Des = Empresa_Doc AND ContaCorr_Des = Conta_Doc AND NumCheque_Des = Numero_Doc AND Banco_Des = Banco_Doc
        LEFT JOIN Composicoes ON Desembolso.CompPl_Des = Composicoes.Cod_Comp
        LEFT JOIN Insumos ON Desembolso.Empresa_Des = Insumos.Empresa_Ins AND Desembolso.Obra_Des = Insumos.Obra_Ins AND Desembolso.InsumoPl_Des = Insumos.Cod_Ins
        LEFT JOIN InsumosGeral ON Desembolso.InsumoPl_Des = InsumosGeral.Cod_Ins
        WHERE ISNULL(Data_Doc, DtPgto_Des) BETWEEN '01/01/2023' AND '12/01/2050' AND CASE WHEN StatusParc_Des <> 2 THEN 1 ELSE 2 END IN (1,2,3)
        GROUP BY Empresa_Des, Obra_Des, ItemProc_Des, DescItemProc_Des, InsumoPl_Des, CompPl_Des, NumProc_Des, NumParc_Des, DocFiscal_Des, ISNULL(Data_Doc, DtPgto_Des), DescInsPl_Des, DescCompPl_Des, ProdutoPl_Des,
            NominalProc_Des, Banco_Des, ContaCorr_Des, ItemPl_Des, Desembolso.QtdeItem_Des, Desembolso.ValorUnitItem_Des, Desembolso.UnidItemProc_Des, Composicoes.Unid_Comp,
            ISNULL(Insumos.Unid_Ins, InsumosGeral.Unid_Ins), ContratoPl_Des
        UNION
        SELECT
            Receitas.*,
            VlrItemReceber + Recebido [TotalReceita],
            'Receitas' [TipoControle],
            'R' [Tipo],
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL [ContratoPL]
        FROM (
            SELECT
                Empresa_Rpd,
                Obra_Rpd,
                CAST(NumVend_Rpd AS VARCHAR) + '/' + CAST(NumParc_Rpd AS VARCHAR) [Parcela],
                CAST(Produto_Itr AS VARCHAR) [Produto],
                '' [Servico],
                Descricao_Psc [DescrInsumo],
                Descricao_Psc [DescrServico],
                Identificador_Unid [NumProc],
                CAST(NumNfAux_Nf AS VARCHAR) [Doc Fiscal],
                DataP,
                ISNULL((CASE WHEN Status = 'Receber' THEN VlRec ELSE 0 END),0) [VlrItemReceber],
                ISNULL((CASE WHEN Status = 'Recebido' THEN VlRec ELSE 0 END),0) [Recebido],
                '0' [VlrComp],
                CAST(Cliente_Rpg AS VARCHAR) + ' - ' + Nome_Pes [Cliente],
                BancoChq_Rpg,
                ContaChq_Rpg,
                Produto_Itr
            FROM (
                SELECT
                    Empresa_Rpd,
                    Obra_Rpd,
                    Produto_Itr,
                    NumVend_Rpd,
                    NumParc_Rpd,
                    ISNULL(Data_Doc, Data_Rec) [DataP],
                    Cliente_Rpg,
                    SUM((CASE WHEN(PercentValor_Rpd *((PrecoProc_Itr * Qtde_Itr) - ValComissaoDir_Itr)) = 0 THEN 1 ELSE (PercentValor_Rpd *((PrecoProc_Itr * Qtde_Itr) - ValComissaoDir_Itr)) END) /
                        (CASE WHEN ValorTot_VRec = 0 THEN (CASE WHEN(PercentValor_Rpd *((PrecoProc_Itr * Qtde_Itr) - ValComissaoDir_Itr)) = 0 THEN 1 ELSE (PercentValor_Rpd *((PrecoProc_Itr * Qtde_Itr) - ValComissaoDir_Itr)) END) ELSE ValorTot_VRec END)
                    ) [VlRec],
                    'Recebido' [Status],
                    BancoChq_Rpg,
                    ContaChq_Rpg
                FROM RecebePgto
                INNER JOIN RecebePgtoDiv ON Empresa_Rpg = Empresa_Rpd AND NumReceb_Rpg = NumReceb_Rpd AND Tipo_Rpg = TipoRpg_Rpd AND NumCont_Rpg = NumCont_Rpd
                INNER JOIN VendasRecebidas ON Empresa_Rpd = Empresa_VRec AND NumVend_Rpd = Num_VRec AND Obra_Rpd = Obra_VRec
                INNER JOIN ItensRecebidas ON Empresa_VRec = Empresa_Itr AND Num_VRec = NumVend_Itr AND Obra_VRec = Obra_Itr
                INNER JOIN Recebidas ON Empresa_Rpd = Empresa_Rec AND NumVend_Rpd = NumVend_Rec AND Obra_Rpd = Obra_Rec AND NumParc_Rpd = NumParc_Rec AND ParcType_Rpd = ParcType_Rec AND Tipo_Rpd = Tipo_Rec AND NumParcGer_Rpd = NumParcGer_Rec
                INNER JOIN Extrato ON BancoDep_Rpg = Banco_Doc AND Empresa_Rpg = Empresa_Doc AND ContaDep_Rpg = Conta_Doc AND CAST(NumDep_Rpg AS VARCHAR) = Numero_Doc
                WHERE Status_Rpg <> 2 AND TipoVenda_VRec IN (0,1,2,3,4) AND Data_Doc BETWEEN '01/01/2023' AND '12/01/2050'
                GROUP BY Empresa_Rpd, Obra_Rpd, Produto_Itr, NumVend_Rpd, NumParc_Rpd, ISNULL(Data_Doc, Data_Rec), Cliente_Rpg, BancoChq_Rpg, ContaChq_Rpg
                UNION
                SELECT
                    Empresa_Ven,
                    Obra_Ven,
                    Produto_Itv,
                    Num_Ven,
                    NumParcGer_Prc,
                    DataPror_Prc,
                    Cliente_Prc,
                    ValParcela_Crc * PorcentagemPorProduto [TotalReceber],
                    'Receber' [Status],
                    -1 [Banco],
                    '1-1' [Conta]
                FROM (
                    SELECT
                        Empresa_Ven,
                        Obra_Ven,
                        Num_Ven,
                        Produto_Itv,
                        ((PrecoProc_Itv * Qtde_Itv) - ValComissaoDir_Itv) / ValorTot_Ven [PorcentagemPorProduto]
                    FROM Vendas
                    INNER JOIN ItensVenda ON Empresa_Ven = Empresa_Itv AND Obra_Ven = Obra_Itv AND Num_Ven = NumVend_Itv
                    WHERE TipoVenda_Ven IN (0,1,2,3,4)
                ) [PorcentagemPorProduto]
                INNER JOIN (
                    SELECT *
                    FROM ContasReceber
                    INNER JOIN ContasReceberCalc ON Empresa_Prc = Empresa_Crc AND Obra_Prc = Obra_Crc AND NumVend_Prc = NumVend_Crc AND NumParc_Prc = NumParc_Crc AND Tipo_Prc = Tipo_Crc AND NumParcGer_Prc = NumParcGer_Crc
                    WHERE DataPror_Prc BETWEEN '01/01/2023' AND '12/01/2050'
                ) [ContasReceber] ON Empresa_Ven = Empresa_Prc AND Obra_Ven = Obra_Prc AND Num_Ven = NumVend_Prc
            ) [TotRec]
            LEFT JOIN (
                SELECT EmpresaNf_Vnv, ObraVen_Vnv, NumVen_Vnv, MAX(NumNfAux_Nf) [NumNfAux_Nf]
                FROM VinculoNotaVenda
                INNER JOIN NotasFiscais ON EmpresaNf_Vnv = Empresa_Nf AND NumNf_Vnv = Num_Nf
                GROUP BY EmpresaNf_Vnv, ObraVen_Vnv, NumVen_Vnv
            ) [VinculoNotaVenda] ON Empresa_Rpd = EmpresaNf_Vnv AND Obra_Rpd = ObraVen_Vnv AND NumVend_Rpd = NumVen_Vnv
            LEFT JOIN PrdSrv ON Produto_Itr = NumProd_Psc
            LEFT JOIN (
                SELECT Empresa_Itv, Obra_Itv, NumVend_Itv, Produto_Itv, MAX(CodPerson_Itv) [Personalizao]
                FROM ItensVenda
                GROUP BY Empresa_Itv, Obra_Itv, NumVend_Itv, Produto_Itv
                UNION
                SELECT Empresa_Itr, Obra_Itr, NumVend_Itr, Produto_Itr, MAX(CodPerson_Itr) [Personalizao]
                FROM ItensRecebidas
                GROUP BY Empresa_Itr, Obra_Itr, NumVend_Itr, Produto_Itr
            ) [Unidades] ON Empresa_Rpd = Empresa_Itv AND Produto_Itr = Produto_Itv AND Obra_Rpd = Obra_Itv AND NumVend_Rpd = NumVend_Itv
            LEFT JOIN UnidadePer ON Empresa_Itv = Empresa_Unid AND Produto_Itv = Prod_Unid AND Personalizao = NumPer_Unid
            LEFT JOIN Pessoas ON Cliente_Rpg = Cod_Pes
            WHERE CASE Status WHEN 'Receber' THEN 1 WHEN 'Recebido' THEN 2 END IN (1,2,3)
        ) [Receitas]
        WHERE NumProc NOT LIKE '%PERMUTA%' OR ISNULL(NumProc, '') = ''
        UNION
        SELECT
            Empresa_Es,
            Obra_Es,
            '' [Item],
            CategMovFin_Es [Categoria],
            '' [Servico],
            Desc_Cmf [DescrInsumo],
            Desc_Cmf [DescrServico],
            '0' [NumProcesso],
            CAST('0' AS VARCHAR) [DocFiscal],
            Data_Es,
            '0.01' [VlrAtPagar],
            '0.01' [VlrAtPago],
            '0' [VlrComp],
            CAST(Cap_Es AS VARCHAR) + ' - ' + Desc_CGer [CapMov],
            Banco_Es,
            Conta_Es,
            -1 [Produto],
            SUM(Valor_Es) [ValorControle],
            'RecEntrada' [TipoControle],
            'R' [Tipo],
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL [ContratoPL]
        FROM EntSaiEmpAplic
        LEFT JOIN CategoriasDeMovFin ON Codigo_Cmf = CategMovFin_Es
        LEFT JOIN CAP ON Codigo_CGer = Cap_Es
        WHERE Data_Es BETWEEN '01/01/2023' AND '12/01/2050' AND 3 IN (1,2,3) AND EntSai_Es = 0
        GROUP BY Empresa_Es, Obra_Es, CategMovFin_Es, Desc_Cmf, Data_Es, CAP_Es, Desc_CGer, Banco_Es, Conta_Es
        UNION
        SELECT
            Empresa_Es,
            Obra_Es,
            '' [Item],
            CategMovFin_Es [Categoria],
            '' [Servico],
            Desc_Cmf [DescrInsumo],
            Desc_Cmf [DescrServico],
            '0' [NumProcesso],
            CAST('0' AS VARCHAR) [DocFiscal],
            Data_Es,
            '0.01' [VlrAtPagar],
            '0.01' [VlrAtPago],
            '0' [VlrComp],
            CAST(Cap_Es AS VARCHAR) + ' - ' + Desc_CGer [CapMov],
            Banco_Es,
            Conta_Es,
            -1 [Produto],
            SUM(Valor_Es) [ValorControle],
            'DespSaida' [TipoControle],
            'D' [Tipo],
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL [ContratoPL]
        FROM EntSaiEmpAplic
        LEFT JOIN CategoriasDeMovFin ON Codigo_Cmf = CategMovFin_Es
        LEFT JOIN CAP ON Codigo_CGer = Cap_Es
        WHERE Data_Es BETWEEN '01/01/2023' AND '12/01/2050' AND 3 IN (1,2,3) AND EntSai_Es = 1
        GROUP BY Empresa_Es, Obra_Es, CategMovFin_Es, Desc_Cmf, Data_Es, CAP_Es, Desc_CGer, Banco_Es, Conta_Es
        UNION
        SELECT
            EmpresaCred_Tb [Cod_Emp],
            ObraCred_Tb [Obra],
            '' [Item],
            CategMovFin_Tb [Insumo],
            '' [Servico],
            Desc_Cmf [DescrInsumo],
            Desc_Cmf [DescrServico],
            '0' [NumProcesso],
            NumDoc_Tb [DocFiscal],
            DataConcilCredito_Doc [DataMovimento],
            '0.01' [VlrAtPagar],
            '0.01' [VlrAtPago],
            '0' [VlrComp],
            HistLancCred_Tb [Cliente],
            BcoCred_Tb [Banco],
            ContaCred_Tb [Conta],
            -1 [Produto],
            SUM(Valor_Tb) [TotalReceita],
            'RecEntrada' [TipoControle],
            'R' [Tipo],
            NULL [ItemPl],
            NULL [ItemPlPai],
            NULL [QtdeItem],
            NULL [VlrUnitItem],
            NULL [UnitItemProc],
            NULL [UnidComp],
            NULL [UnidIns],
            NULL [ContratoPL]
        FROM VwTransfBcoExtrato
        LEFT JOIN CategoriasDeMovFin ON CategMovFin_Tb = Codigo_Cmf
        WHERE CreditoConciliado_Doc = 1 AND 4 IN (1,2,3) AND DataConcilCredito_Doc BETWEEN '01/01/2023' AND '12/01/2050'
        GROUP BY EmpresaCred_Tb, ObraCred_Tb, CategMovFin_Tb, Desc_Cmf, NumDoc_Tb, DataConcilCredito_Doc, HistLancCred_Tb, BcoCred_Tb, ContaCred_Tb
        UNION
        SELECT
            Empresa_Tb [Cod_Emp],
            ObraDeb_Tb [Obra],
            '' [Item],
            CategMovFin_Tb [Insumo],
            '' [Servico],
            Desc_Cmf [DescrInsumo],
            Desc_Cmf [DescrServico],
            '0' [NumProcesso],
            NumDoc_Tb [DocFiscal],
            DataConcilDebito_Doc [DataMovimento],
            '0.01' [VlrAtPagar],
            '0.01' [VlrAtPago],
            '0' [VlrComp],
            HistLanc_Tb [Cliente],
            BcoDeb_Tb [Banco],
            ContaDeb_Tb [Conta],
            -1 [Produto],
            SUM(Valor_Tb) [TotalReceita],
            'DespSaida' [TipoControle],
            'D' [Tipo],
            NULL [ItemPl],
            NULL [ItemPlPai],
            NULL [QtdeItem],
            NULL [VlrUnitItem],
            NULL [UnitItemProc],
            NULL [UnidComp],
            NULL [UnidIns],
            NULL [ContratoPL]
        FROM VwTransfBcoExtrato
        LEFT JOIN CategoriasDeMovFin ON CategMovFin_Tb = Codigo_Cmf
        WHERE DebitoConciliado_Doc = 1 AND 4 IN (1,2,3) AND DataConcilDebito_Doc BETWEEN '01/01/2023' AND '12/01/2050'
        GROUP BY Empresa_Tb, ObraDeb_Tb, CategMovFin_Tb, Desc_Cmf, NumDoc_Tb, DataConcilDebito_Doc, HistLanc_Tb, BcoDeb_Tb, ContaDeb_Tb
    ) [Demonstrativo]
    INNER JOIN (
            SELECT Empresa_Obr, Cod_Obr, Descr_Obr FROM Obras
            UNION
            SELECT Empresa_Obr, '' [Obra], 'SEM OBRA' [Descr_Obr] FROM Obras
    ) [Obras] ON Empresa_Obr = Cod_Emp AND Cod_Obr = ISNULL(Obra, '')
    INNER JOIN Empresas ON Codigo_Emp = Empresa_Obr
    LEFT JOIN (
        SELECT DISTINCT
            Empresa_Plt,
            Obra_Plt,
            Prod_Plt,
            Item_Plt,
            Serv_plt,
            Contrato_plt,
            Descr_Plt
        FROM PlanTotal
        WHERE Serv_Plt = '-1'
    ) [PlanTotal] ON Cod_Emp = Empresa_Plt AND Obra = Obra_Plt AND Produto = Prod_Plt AND ItemPlPai = Item_Plt AND Servico = Serv_plt AND ContratoPL = Contrato_plt
    WHERE CAST(Produto AS VARCHAR) LIKE('%')
END
`

function toISODate(d: any): string | null {
    if (!d) return null
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return null
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

interface PagoAgg { obra: string | null; data_movimento: string | null; tipo_controle: string | null; vlr_at_pago: number; vlr_at_pagar: number; vlr_comp: number; total_receita: number }

async function gravarPagoApagar(rows: any[]) {
    // Filtros do Power Query: Empresa 4 (Constrowins), Obra <> null, Obra <> 'DP'.
    // Pré-agrega por (obra, data_movimento, tipo_controle) — granularidade que
    // atende todos os cards e reduz drasticamente o nº de linhas (a query crua
    // vem por item/insumo/processo). As somas ficam idênticas.
    const agg = new Map<string, PagoAgg>()
    for (const r of rows) {
        if (r.EmpresaResultado !== EMPRESA_CONSTROWINS || r.Obra == null || r.Obra === 'DP') continue
        const obra = r.Obra?.toString().trim() ?? null
        const data_movimento = toISODate(r.DataMovimento)
        const tipo_controle = r.TipoControle ?? null
        const key = `${obra}|${data_movimento}|${tipo_controle}`
        const cur = agg.get(key) ?? { obra, data_movimento, tipo_controle, vlr_at_pago: 0, vlr_at_pagar: 0, vlr_comp: 0, total_receita: 0 }
        cur.vlr_at_pago += Number(r.VlrAtPago || 0)
        cur.vlr_at_pagar += Number(r.VlrAtPagar || 0)
        cur.vlr_comp += Number(r.VlrComp || 0)
        cur.total_receita += Number(r.TotalReceita || 0)
        agg.set(key, cur)
    }
    const payload = Array.from(agg.values())

    await supabase.from('controle_pago_apagar').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const CHUNK = 1000
    for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase.from('controle_pago_apagar').insert(payload.slice(i, i + CHUNK))
        if (error) throw new Error('controle_pago_apagar insert: ' + error.message)
    }
    return payload.length
}

interface InsumoClienteAgg { descrinsumo: string | null; cliente: string | null; data_movimento: string | null; vlr_at_pagar: number; vlr_at_pago: number }

// Agregação por (DescrInsumo, Cliente, mês) só das Despesas — para as tabelas
// drill-down insumo x cliente (com o mês para o filtro de Ano/Mês).
async function gravarInsumoCliente(rows: any[]) {
    const agg = new Map<string, InsumoClienteAgg>()
    for (const r of rows) {
        if (r.EmpresaResultado !== EMPRESA_CONSTROWINS || r.Obra == null || r.Obra === 'DP') continue
        if (r.TipoControle !== 'Despesas') continue
        const descrinsumo = r.DescrInsumo != null ? r.DescrInsumo.toString().trim() : null
        const cliente = r.Cliente != null ? r.Cliente.toString().trim() : null
        const dm = toISODate(r.DataMovimento)
        const ym = dm ? dm.slice(0, 7) : null
        const data_movimento = ym ? `${ym}-01` : null
        const key = `${descrinsumo}|||${cliente}|||${ym}`
        const cur = agg.get(key) ?? { descrinsumo, cliente, data_movimento, vlr_at_pagar: 0, vlr_at_pago: 0 }
        cur.vlr_at_pagar += Number(r.VlrAtPagar || 0)
        cur.vlr_at_pago += Number(r.VlrAtPago || 0)
        agg.set(key, cur)
    }
    const payload = Array.from(agg.values())
    await supabase.from('controle_pago_insumo_cliente').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const CHUNK = 1000
    for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase.from('controle_pago_insumo_cliente').insert(payload.slice(i, i + CHUNK))
        if (error) throw new Error('controle_pago_insumo_cliente insert: ' + error.message)
    }
    return payload.length
}

async function ciclo() {
    console.log(`[PAGO] [${new Date().toISOString()}] Iniciando atualização...`)
    let pool: sql.ConnectionPool | null = null
    try {
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const r = await pool.request().query(queryPagoApagar)
        const n = await gravarPagoApagar(r.recordset)
        const nic = await gravarInsumoCliente(r.recordset)
        console.log(`[PAGO] OK: ${r.recordset.length} lidas, ${n} pago_apagar, ${nic} insumo_cliente (Empresa 4 / Obra válida).`)
    } catch (e: any) {
        console.log(`[PAGO] ERRO: ${(e?.message || e).toString().slice(0, 150)}`)
    } finally {
        if (pool) { try { await pool.close() } catch { /* ignora */ } }
    }
}

process.on('unhandledRejection', (r) => console.log('[PAGO] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[PAGO] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[PAGO] encerrado.'); process.exit(0) })

async function loop() {
    await ciclo()
    setTimeout(loop, INTERVALO_MS)
}

// Só inicia o loop quando executado diretamente (não ao ser importado por um diag).
const isMain = (() => {
    try { return import.meta.url === new URL(`file://${process.argv[1]}`).href || process.argv[1]?.includes('sync-pago-apagar') }
    catch { return true }
})()
if (isMain) {
    console.log('[PAGO] Worker de atualização do Pago/A Pagar (KPI Controle) iniciado.')
    loop()
}
