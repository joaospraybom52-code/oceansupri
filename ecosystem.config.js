// PM2 — workers de sincronização da aba KPI'S (módulo Controle).
// Rodam 24/7 na VM Oracle (Always Free), cada um em loop interno de 10 min.
// Subir tudo:    pm2 start ecosystem.config.js
// Status:        pm2 status
// Logs:          pm2 logs sync-pago
// Salvar p/ boot: pm2 save  &&  pm2 startup
// ⚠️ Os 4 workers da KPI'S (recebido, pago, vendasrec, areceber) NÃO rodam aqui:
// são pesados demais pra VM Always Free de 1GB (o 'pago' carrega ~106k linhas e
// estoura a memória). Eles rodam MANUALMENTE no PC: `npm run sync:kpis`.
// Na VM ficam só os leves: sync-compras (board) — custo e uau-reconcile são geridos
// fora deste arquivo.
module.exports = {
    apps: [
        { name: 'robo-compras', script: 'npm', args: 'run sync:compras', cwd: __dirname, autorestart: true, max_restarts: 50, time: true },
    ],
}
