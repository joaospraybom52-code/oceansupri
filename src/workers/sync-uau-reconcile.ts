import sql from 'mssql';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// =============================================================================
// Worker de RECONCILIAÇÃO (rede de segurança do robo-uau)
//
// Objetivo: capturar pedidos que o robô principal perde por causa do filtro
// "somente de hoje em diante". Usa exatamente as mesmas regras de negócio do
// robô principal (mesma query, mesmos filtros, mesma deduplicação por
// numero_pedido + codigo_uau + descricao_insumo), mudando só:
//   - a JANELA DE DATA: últimos N dias (não só hoje), pegando o "feito ontem,
//     aprovado hoje";
//   - o INTERVALO: 5 min (é rede de segurança, não o fluxo primário);
//   - RESILIÊNCIA: timeouts do UAU não derrubam o processo (sem crash-loop).
//
// Como a dedup é feita contra o banco real do Supabase, o caso "feito hoje +
// aprovado hoje" é ignorado automaticamente: o robô principal já cadastrou,
// então a checagem das 3 informações encontra o registro e a worker pula.
// =============================================================================

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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
        trustServerCertificate: true,
    },
    connectionTimeout: 20000,
    requestTimeout: 60000,
};

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const JANELA_DIAS = 7;                   // últimos 7 dias

const log = (...args: unknown[]) => console.log(`[RECONCILE]`, ...args);

async function syncData() {
    log(`[${new Date().toISOString()}] Iniciando reconciliação (janela ${JANELA_DIAS} dias)...`);

    let pool: sql.ConnectionPool | null = null;
    try {
        pool = await sql.connect(sqlConfig);
        // Evita que um erro de conexão emitido pelo pool derrube o processo
        pool.on('error', (err) => log('Pool error (ignorado):', err?.message || err));

        const query = `
            SELECT ItensCot_temp.*,
                ROUND((QtdeCot_temp * PrecoOrc_temp), 2) As VlTotal,
                Pedidos.Quem_ped,
                Pedidos.Tipo_ped,
                InsumosGeral.Descr_ins,
                Obras.Descr_obr
            FROM ItensCot_temp
                LEFT JOIN Pedidos
                    ON Pedidos.Empresa_ped = ItensCot_temp.Empresa_temp
                    AND Pedidos.Obra_ped = ItensCot_temp.Obra_temp
                    AND Pedidos.Cod_ped = ItensCot_temp.NumPedido_temp
                LEFT JOIN InsumosGeral
                    ON InsumosGeral.Cod_ins = ItensCot_temp.Insumo_temp
                INNER JOIN Empresas
                    ON Empresas.Codigo_emp = ItensCot_temp.Empresa_temp
                INNER JOIN Obras
                    ON Obras.Empresa_obr = ItensCot_temp.Empresa_temp
                    AND Obras.Cod_obr = ItensCot_temp.Obra_temp
            WHERE ItensCot_temp.Empresa_temp = 4
                AND ItensCot_temp.Cotacao_temp = 0
                AND ItensCot_temp.Excluido_temp = 0
                AND ItensCot_temp.Estagio_temp NOT IN (6, 7)
                AND ItensCot_temp.Cotada_temp <> 2
                AND Pedidos.Tipo_ped IN (0,4,6,7,3,1,9,10)
                AND ItensCot_temp.Confirmado_temp = 1
                -- JANELA MÓVEL: últimos N dias (em vez de "somente hoje")
                AND (Pedidos.DtPedido_ped >= DATEADD(day, -${JANELA_DIAS}, CONVERT(date, GETDATE()))
                     OR ItensCot_temp.DataAlt_temp >= DATEADD(day, -${JANELA_DIAS}, CONVERT(date, GETDATE())))
            ORDER BY NumPedido_temp DESC
        `;

        const result = await pool.request().query(query);
        const records = result.recordset;
        log(`Retornados ${records.length} registros (janela de ${JANELA_DIAS} dias).`);

        let insertedCount = 0;

        for (const row of records) {
            // 1. Resolve a Obra (busca ou cria) — igual ao robô principal
            const obraCodigo = row.Obra_temp?.toString().trim();
            const obraNome = row.Descr_obr?.toString().trim();
            let obraId = null;

            if (obraCodigo) {
                const { data: existingObras } = await supabase
                    .from('obras')
                    .select('id')
                    .eq('codigo', obraCodigo)
                    .limit(1);

                if (existingObras && existingObras.length > 0) {
                    obraId = existingObras[0].id;
                } else {
                    const { data: novaObra, error: insertObraError } = await supabase
                        .from('obras')
                        .insert({ codigo: obraCodigo, nome: obraNome || `Obra ${obraCodigo}`, ativo: true })
                        .select('id')
                        .single();
                    if (novaObra) obraId = novaObra.id;
                    else log('Erro ao criar obra', insertObraError?.message);
                }
            }

            // 2. Deduplicação: numero_pedido + codigo_uau + descricao_insumo
            const codigo_uau_real = row.Obra_temp?.toString() || null;
            const descricao_insumo_real = row.Descr_ins || 'Sem descrição';

            const { data: existingPedido, error: checkError } = await supabase
                .from('pedidos_compra')
                .select('id')
                .eq('numero_pedido', row.NumPedido_temp?.toString())
                .eq('codigo_uau', codigo_uau_real)
                .eq('descricao_insumo', descricao_insumo_real)
                .maybeSingle();

            if (checkError) {
                log(`Erro ao checar pedido ${row.NumPedido_temp}:`, checkError.message);
                continue;
            }
            if (existingPedido) continue; // já existe → não duplica

            // 3. Mesma regra de solicitantes ignorados do robô principal
            const solicitante = row.Quem_ped?.toString().trim();
            const solicitanteUpper = solicitante?.toUpperCase() || '';
            const ignoredSolicitantes = ['LILIANES', 'AMANDA', 'ARLETE', 'ALINE', 'FINANCEIRO'];
            if (ignoredSolicitantes.includes(solicitanteUpper)) continue;

            // 4. Insere o card que escapou do robô principal
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
                solicitante_obra: solicitante || null,
            };

            const { error: insertError } = await supabase.from('pedidos_compra').insert(novoPedido);
            if (insertError) {
                log(`Erro ao inserir card:`, insertError.message);
            } else {
                insertedCount++;
                log(`+ RECUPERADO: Pedido ${row.NumPedido_temp} - Obra ${codigo_uau_real} - Item ${row.Insumo_temp}`);
            }
        }

        log(`Reconciliação concluída. ${insertedCount} pedidos recuperados.`);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        log('Erro no ciclo (será tentado de novo no próximo intervalo):', msg);
    } finally {
        if (pool) {
            try { await pool.close(); } catch { /* ignora erro ao fechar */ }
        }
    }
}

// Não derruba o processo por erros não tratados (evita crash-loop)
process.on('unhandledRejection', (reason) => log('unhandledRejection (ignorado):', reason));
process.on('uncaughtException', (err) => log('uncaughtException (ignorado):', err?.message || err));
process.on('SIGINT', () => { log('Worker encerrado.'); process.exit(0); });

// Loop com setTimeout recursivo (evita sobreposição de ciclos)
async function loop() {
    await syncData();
    setTimeout(loop, SYNC_INTERVAL_MS);
}

log('Worker de RECONCILIAÇÃO UAU <-> Supabase iniciado.');
loop();
