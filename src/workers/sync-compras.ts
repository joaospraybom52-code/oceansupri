/* eslint-disable @typescript-eslint/no-explicit-any */
import sql from 'mssql'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import dotenv from 'dotenv'
import path from 'path'

// =============================================================================
// Worker do módulo Suprimentos (board Kanban) — roda no NAS/Oracle via PM2.
// A cada 2 min consulta o UAU (cotações/OC dos pedidos) e MOVE os cards do board
// automaticamente:
//   - card (codigo_uau, numero_pedido, descricao_insumo) casa com a linha do UAU
//     (CodObra, Pedido, Insumo);
//   - se Cotação > 0 -> "Em cotação" (categoria_cap = cotação, agrupa por obra+cotação);
//   - se O.C    > 0 -> "Ordem Gerada" (numero_ordem_compra = OC, agrupa por obra+OC).
// Só AVANÇA (nunca volta). "Pedido confirmado" sem cotação não é tocado.
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

const INTERVALO_MS = 2 * 60 * 1000 // 2 min

// Consulta enxuta (mesmas chaves da consulta do Power BI: CodObra, Pedido, Insumo,
// Cotação, O.C), só com o subselect de OC — bem mais leve no UAU.
const queryCompras = `
SELECT it.Obra_temp AS CodObra, it.NumPedido_temp AS Pedido, it.Cotacao_temp AS Cotacao,
       it.Insumo_temp AS CodIns, ig.Descr_ins AS Insumo,
       oci.OC, oci.Preco, oci.UsuarioCompra, oci.DataCompra,
       (SELECT MIN(s.DataConf_Smlc) FROM SimulacoesConf s
        WHERE s.Empresa_Smlc = it.Empresa_temp AND s.NumCot_Smlc = it.Cotacao_temp AND s.ObraCot_Smlc = it.Obra_temp) AS DataCotacao
FROM ItensCot_temp it
LEFT JOIN Pedidos p ON p.Empresa_ped = it.Empresa_temp AND p.Obra_ped = it.Obra_temp AND p.Cod_ped = it.NumPedido_temp
INNER JOIN InsumosGeral ig ON it.Insumo_temp = ig.Cod_ins
INNER JOIN Obras o ON it.Obra_temp = o.cod_obr AND it.Empresa_temp = o.Empresa_obr
OUTER APPLY (
    SELECT MAX(ord.NumeroOC_Ocp) AS OC, MAX(ioc.Preco_ioc) AS Preco,
           MIN(ord.Usuario_Ocp) AS UsuarioCompra, MIN(ord.DataGer_Ocp) AS DataCompra
    FROM OrdemCompra ord
    INNER JOIN ItensOrdemCompra ioc
        ON ord.Empresa_Ocp = ioc.Empresa_Ioc AND ord.Obra_Ocp = ioc.Obra_Ioc AND ord.NumeroOC_Ocp = ioc.NumeroOC_Ioc
    WHERE ord.Empresa_Ocp = it.Empresa_temp AND ord.NumCot_Ocp = it.Cotacao_temp AND ioc.CodInsumo_Ioc = it.Insumo_temp
) oci
WHERE p.Tipo_ped <> 8 AND p.DtPedido_Ped BETWEEN '20260101' AND '20300101'
`

const norm = (s: any) => (s ?? '').toString().trim().toUpperCase()

// UUID determinístico a partir de uma string (pra o grupo de cards ficar estável).
function uuidDe(key: string): string {
    const h = createHash('md5').update(key).digest('hex')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

// Posição de cada status nos 3 quadros (pra só avançar)
const RANK: Record<string, number> = {
    requisitado: 0,
    em_cotacao: 1, aguardando_aprovacao: 1,
    aprovado: 2, ordem_gerada: 2, em_transito: 2, aguardando_entrega: 2, entregue: 2,
}

async function ciclo() {
    let pool: sql.ConnectionPool | null = null
    try {
        // 1. Consulta UAU
        pool = await sql.connect(sqlConfig)
        pool.on('error', () => { })
        const rows = (await pool.request().query(queryCompras)).recordset

        // 2. Mapa de match: obra|pedido|insumo -> { cotacao, oc }. Em re-cotação,
        //    prefere a linha com OC e, depois, a maior cotação.
        const toISO = (d: any) => d ? new Date(d).toISOString() : null
        const mapa = new Map<string, { cotacao: number; oc: number; preco: number; usuario: string | null; dataCompra: string | null; dataCotacao: string | null }>()
        for (const r of rows) {
            const key = `${norm(r.CodObra)}||${norm(r.Pedido)}||${norm(r.Insumo)}`
            const cotacao = r.Cotacao != null ? Number(r.Cotacao) : 0
            const oc = r.OC != null ? Number(r.OC) : 0
            const cur = mapa.get(key)
            if (!cur || (oc > 0 && cur.oc <= 0) || (oc === cur.oc && cotacao > cur.cotacao)) {
                mapa.set(key, {
                    cotacao, oc,
                    preco: r.Preco != null ? Number(r.Preco) : 0,
                    usuario: r.UsuarioCompra != null ? r.UsuarioCompra.toString().trim() : null,
                    dataCompra: toISO(r.DataCompra),
                    dataCotacao: toISO(r.DataCotacao),
                })
            }
        }

        // 3. Pedidos do app
        const { data: pedidos, error } = await supabase
            .from('pedidos_compra')
            .select('id, codigo_uau, numero_pedido, descricao_insumo, status_fsm, categoria_cap, numero_ordem_compra, grupo_cotacao_id, valor_fechado, comprador_uau, data_em_cotacao, data_ordem_gerada')
        if (error) throw new Error('pedidos_compra select: ' + error.message)

        // 4. Match + alvo + avanço (só os campos que mudaram)
        const updates: { id: string; patch: any }[] = []
        for (const p of pedidos ?? []) {
            const key = `${norm(p.codigo_uau)}||${norm(p.numero_pedido)}||${norm(p.descricao_insumo)}`
            const m = mapa.get(key)
            if (!m) continue
            const obra = norm(p.codigo_uau)

            const patch: any = {}
            if (m.oc > 0) {
                patch.status_fsm = 'ordem_gerada'
                if (m.cotacao > 0) patch.categoria_cap = String(m.cotacao)
                patch.numero_ordem_compra = String(m.oc)
                patch.grupo_cotacao_id = uuidDe(`OC|${obra}|${m.oc}`)
                if (m.preco > 0) patch.valor_fechado = m.preco
                if (m.usuario) patch.comprador_uau = m.usuario
                if (m.dataCompra) patch.data_ordem_gerada = m.dataCompra
                if (m.dataCotacao) patch.data_em_cotacao = m.dataCotacao
            } else if (m.cotacao > 0) {
                patch.status_fsm = 'em_cotacao'
                patch.categoria_cap = String(m.cotacao)
                patch.grupo_cotacao_id = uuidDe(`COT|${obra}|${m.cotacao}`)
                if (m.dataCotacao) patch.data_em_cotacao = m.dataCotacao
            } else continue

            // só avança de status (nunca regride)
            if (RANK[patch.status_fsm] < (RANK[p.status_fsm ?? 'requisitado'] ?? 0)) continue

            const diff: any = {}
            for (const k of Object.keys(patch)) {
                const cur = (p as any)[k]; const nxt = patch[k]
                let igual: boolean
                if (k === 'data_em_cotacao' || k === 'data_ordem_gerada') igual = (cur ? new Date(cur).getTime() : 0) === (nxt ? new Date(nxt).getTime() : 0)
                else if (k === 'valor_fechado') igual = Number(cur || 0) === Number(nxt || 0)
                else igual = String(cur ?? '') === String(nxt ?? '')
                if (!igual) diff[k] = nxt
            }
            if (Object.keys(diff).length === 0) continue
            updates.push({ id: p.id, patch: diff })
        }

        // 5. Aplica updates (em paralelo, em lotes)
        const LOTE = 20
        for (let i = 0; i < updates.length; i += LOTE) {
            await Promise.all(updates.slice(i, i + LOTE).map(u =>
                supabase.from('pedidos_compra').update(u.patch).eq('id', u.id),
            ))
        }

        console.log(`[COMPRAS] OK: ${rows.length} linhas UAU, ${pedidos?.length ?? 0} cards, ${updates.length} movidos.`)
    } catch (e: any) {
        console.log(`[COMPRAS] ERRO: ${(e?.message || e).toString().slice(0, 150)}`)
    } finally {
        if (pool) { try { await pool.close() } catch { /* ignora */ } }
    }
}

process.on('unhandledRejection', (r) => console.log('[COMPRAS] unhandledRejection:', r))
process.on('uncaughtException', (e) => console.log('[COMPRAS] uncaughtException:', (e as any)?.message || e))
process.on('SIGINT', () => { console.log('[COMPRAS] encerrado.'); process.exit(0) })

async function loop() {
    await ciclo()
    setTimeout(loop, INTERVALO_MS)
}

console.log('[COMPRAS] Worker do board Suprimentos iniciado (sync a cada 2 min).')
loop()
