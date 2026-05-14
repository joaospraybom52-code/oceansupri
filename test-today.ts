import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sqlConfig: sql.config = {
    user: process.env.UAU_DB_USER,
    password: process.env.UAU_DB_PASS,
    database: process.env.UAU_DB_NAME,
    server: process.env.UAU_DB_SERVER!,
    port: parseInt(process.env.UAU_DB_PORT || '14104'),
    connectionTimeout: 30000,
    requestTimeout: 30000,
    options: { encrypt: false, trustServerCertificate: true }
};

async function check() {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        const result = await pool.request().query(`
            SELECT TOP 10 NumPedido_temp, Pedidos.Cod_ped, Pedidos.DtPedido_ped, ItensCot_temp.DataAlt_temp, Quem_ped, Pedidos.Obra_ped, ItensCot_temp.Cotacao_temp, ItensCot_temp.Excluido_temp, ItensCot_temp.Estagio_temp, ItensCot_temp.Cotada_temp, Pedidos.Tipo_ped, ItensCot_temp.Confirmado_temp
            FROM ItensCot_temp 
            LEFT JOIN Pedidos ON Pedidos.Cod_ped = ItensCot_temp.NumPedido_temp
            WHERE ItensCot_temp.NumPedido_temp IN (574, 573) OR Pedidos.Cod_ped IN (574, 573)
            ORDER BY Pedidos.DtPedido_ped DESC
        `);
        console.log('Orders today:', result.recordset);
    } catch (e) {
        console.error(e);
    } finally {
        if (pool) pool.close();
    }
}
check();
