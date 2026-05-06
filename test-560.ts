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
    options: { encrypt: false, trustServerCertificate: true }
};

async function check() {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        const result = await pool.request().query(`
            SELECT TOP 1 NumPedido_temp, DataAlt_temp, Pedidos.DtPedido_ped
            FROM ItensCot_temp 
            LEFT JOIN Pedidos ON Pedidos.Cod_ped = ItensCot_temp.NumPedido_temp
            WHERE NumPedido_temp = 560
        `);
        console.log('Dates for order 560:', result.recordset);
    } catch (e) {
        console.error(e);
    } finally {
        if (pool) pool.close();
    }
}
check();
