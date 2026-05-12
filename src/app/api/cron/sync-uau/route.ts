import { NextResponse } from 'next/server';
import sql from 'mssql';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Vercel Cron sends a Bearer token matching CRON_SECRET for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const sqlConfig: sql.config = {
        user: process.env.UAU_DB_USER,
        password: process.env.UAU_DB_PASS,
        database: process.env.UAU_DB_NAME,
        server: process.env.UAU_DB_SERVER!,
        port: parseInt(process.env.UAU_DB_PORT || '14104'),
        options: {
            encrypt: false, 
            trustServerCertificate: true 
        }
    };

    let pool: sql.ConnectionPool | null = null;
    let insertedCount = 0;

    try {
        pool = await sql.connect(sqlConfig);

        const query = `
            SELECT ItensCot_temp.*,
                CONVERT(DATETIME,CONVERT(VARCHAR(10), DataAlt_temp, 103),103) As DataAlt,
                CONVERT(varchar,DataAlt_temp,108) As HoraAlt,
                ROUND((QtdeCot_temp * PrecoOrc_temp), 2) As VlTotal,
                Pedidos.CasaDecQtde_Ped,
                Pedidos.CasaDecPreco_Ped,
                Pedidos.Quem_ped,
                Pedidos.DtPedido_ped,
                Pedidos.ObsPedido_ped,
                Pedidos.Tipo_ped,
                CONVERT(DATETIME,CONVERT(VARCHAR(10), Pedidos.DtPedido_ped, 103),103) As DtPedido,
                CONVERT(varchar,DtPedido_Ped,108) As HoraPedido,
                InsumosGeral.Descr_ins,
                InsumosGeral.Anexos_ins,
                CategoriasDeInsumo.Desc_cger,
                Empresas.Desc_emp,
                Obras.Descr_obr,
                Obras.Uf_obr,
                CASE WHEN Desc_cid Is NULL THEN cid_obr ELSE desc_cid END As Desc_cid,
                COALESCE(AcordoCorporativoInsumosUF.EmAcordo_aciuf, 0) As UtilizaEmAcordo,
                'NAO' As EXPIRADO
            FROM ItensCot_temp
                LEFT JOIN Pedidos
                    ON Pedidos.Empresa_ped = ItensCot_temp.Empresa_temp
                    AND Pedidos.Obra_ped = ItensCot_temp.Obra_temp
                    AND Pedidos.Cod_ped = ItensCot_temp.NumPedido_temp
                LEFT JOIN CategoriasDeInsumo
                    ON CategoriasDeInsumo.Codigo_cger = ItensCot_temp.Categ_temp
                LEFT JOIN InsumosGeral
                    ON InsumosGeral.Cod_ins = ItensCot_temp.Insumo_temp
                INNER JOIN Empresas
                    ON Empresas.Codigo_emp = ItensCot_temp.Empresa_temp
                INNER JOIN Obras
                    ON Obras.Empresa_obr = ItensCot_temp.Empresa_temp
                    AND Obras.Cod_obr = ItensCot_temp.Obra_temp
                LEFT JOIN Cidades
                    ON Cidades.Num_cid = Obras.NumCid_obr
                INNER JOIN (
                    SELECT * FROM fn_ListEmpObr('4|ADMCO,4|ALMOX,4|AUR01,4|AUR02,4|BC002,4|BV001,4|CAC01,4|CAG01,4|CN001,4|CN003,4|CONS,4|CS001,4|CS002,4|CV001,4|CVENT,4|DP,4|DRT02,4|DRT03,4|DRT04,4|EDT01,4|EJA01,4|EJA03,4|EJA04,4|EJA05,4|EJA06,4|EMIR1,4|ES001,4|EURO1,4|FCC01,4|FS001,4|GB006,4|GR001,4|GURDB,4|KN001,4|KN004,4|KN005,4|LC002,4|LP001,4|LV001,4|LV002,4|LV004,4|MLB01,4|MUNCK,4|NES01,4|NES05,4|NES06,4|NES07,4|NES08,4|NES09,4|NES10,4|NES11,4|NES12,4|NES14,4|NES15,4|NES16,4|NES17,4|NES18,4|NES19,4|NORON,4|PAT1,4|PEN01,4|PER01,4|PMT01,4|PMTCW,4|PUC01,4|REA01,4|REA02,4|RET01,4|RET02,4|RV03,4|SD005,4|STEK1,4|TET01,4|VLDIE,4|VR001',',')
                ) As EmpObras
                    ON EmpObras.Empresa = ItensCot_temp.Empresa_temp
                    AND EmpObras.Obra = ItensCot_temp.Obra_temp
                OUTER APPLY (
                    SELECT aciu.UF_aciuf, aciu.CodIns_aciuf,
                        CASE
                            WHEN aciu.EmAcordo_aciuf = 2 THEN COALESCE(RegrasAcordo.EmAcordo, 0)
                            ELSE aciu.EmAcordo_aciuf
                        END AS EmAcordo_aciuf
                    FROM AcordoCorporativoInsumosUF aciu
                    OUTER APPLY (
                        SELECT aci.CodIns_aci, ac.UFEntrega_ac, 1 As EmAcordo
                        FROM AcordoCorporativoInsumos aci
                        INNER JOIN AcordoCorporativo ac
                            ON ac.Num_ac = aci.NumAc_aci
                            AND ac.Confirmado_ac = 1
                            AND ac.UFEntrega_ac = Obras.Uf_obr
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM AcordoCorporativoInsumos aci2
                            INNER JOIN AcordoCorporativo ac2
                                ON ac2.Num_ac = aci2.NumAc_aci
                                AND ac2.Confirmado_ac = 1
                                AND ac2.UFEntrega_ac = Obras.Uf_obr
                            INNER JOIN AcordoCorporativoObrasExcluidas acoe
                                ON ac2.Num_ac = acoe.NumAc_acoe
                                AND acoe.Empresa_acoe = ItensCot_temp.Empresa_temp
                                AND acoe.Obra_acoe = ItensCot_temp.Obra_temp
                            WHERE aci2.CodIns_aci = aci.CodIns_aci
                                AND aci.Num_aci = aci2.Num_aci
                        )
                        AND aci.CodIns_aci = ItensCot_temp.Insumo_temp
                        GROUP BY aci.CodIns_aci, ac.UFEntrega_ac
                    ) AS RegrasAcordo
                    WHERE aciu.UF_aciuf = Obras.Uf_obr
                        AND aciu.CodIns_aciuf = ItensCot_temp.Insumo_temp
                ) As AcordoCorporativoInsumosUF
            WHERE ItensCot_temp.Cotacao_temp = 0
                AND ItensCot_temp.Excluido_temp = 0
                AND ItensCot_temp.Estagio_temp NOT IN (6, 7)
                AND ItensCot_temp.Cotada_temp <> 2
                AND Pedidos.Tipo_ped IN (0,4,6,7,3,1,9,10)
                AND ItensCot_temp.Confirmado_temp = 1
                AND (Pedidos.DtPedido_ped >= CONVERT(date, GETDATE()) OR ItensCot_temp.DataAlt_temp >= CONVERT(date, GETDATE()))
            ORDER BY NumPedido_temp DESC
        `;

        const result = await pool.request().query(query);
        const records = result.recordset;

        for (const row of records) {
            const obraCodigo = row.Obra_temp?.toString();
            const obraNome = row.Descr_obr?.toString();
            let obraId = null;

            if (obraCodigo) {
                const { data: existingObra } = await supabase
                    .from('obras')
                    .select('id')
                    .eq('codigo', obraCodigo)
                    .maybeSingle();

                if (existingObra) {
                    obraId = existingObra.id;
                } else {
                    const { data: novaObra } = await supabase
                        .from('obras')
                        .insert({
                            codigo: obraCodigo,
                            nome: obraNome || `Obra ${obraCodigo}`,
                            ativo: true
                        })
                        .select('id')
                        .single();
                        
                    if (novaObra) {
                        obraId = novaObra.id;
                    }
                }
            }

            const codigo_uau_real = row.Obra_temp?.toString() || null;
            const descricao_insumo_real = row.Descr_ins || 'Sem descrição';
            
            const { data: existingPedido } = await supabase
                .from('pedidos_compra')
                .select('id')
                .eq('numero_pedido', row.NumPedido_temp?.toString())
                .eq('codigo_uau', codigo_uau_real)
                .eq('descricao_insumo', descricao_insumo_real)
                .maybeSingle();

            if (existingPedido) continue;

            const solicitante = row.Quem_ped?.toString().trim();
            const solicitanteUpper = solicitante?.toUpperCase() || '';
            const ignoredSolicitantes = ['LILIANES', 'AMANDA', 'ARLETE', 'ALINE', 'FINANCEIRO'];
            
            if (ignoredSolicitantes.includes(solicitanteUpper)) continue;

            const emergencial = row.Tipo_ped === 6;

            const novoPedido = {
                codigo_uau: codigo_uau_real,
                status_fsm: 'requisitado',
                obra_id: obraId,
                descricao_insumo: descricao_insumo_real,
                numero_pedido: row.NumPedido_temp?.toString(),
                emergencial,
                valor_orcado: row.VlTotal,
                data_requisicao: new Date().toISOString(),
                solicitante_obra: solicitante || null
            };

            const { error: insertError } = await supabase
                .from('pedidos_compra')
                .insert(novoPedido);

            if (!insertError) {
                insertedCount++;
            }
        }

        return NextResponse.json({ success: true, count: insertedCount, message: `Sincronizou ${insertedCount} novos pedidos.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}
