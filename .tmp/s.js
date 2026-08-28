const { Client } = require('pg')
;(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.aizcxfpkzaoaqkgxcmgp:Constrowins@aws-0-us-west-2.pooler.supabase.com:5432/postgres', ssl: { rejectUnauthorized: false } })
  await c.connect()
  console.table((await c.query(`select status, count(*) n, string_agg(codigo_uau, ', ' order by codigo_uau) obras from obras_eng group by 1 order by 1`)).rows)
  await c.end()
})().catch(e=>{console.error(e.message);process.exit(1)})
