// PM2 — workers de sincronização da aba KPI'S (módulo Controle).
// Rodam 24/7 na VM Oracle (Always Free), cada um em loop interno de 10 min.
// Subir tudo:    pm2 start ecosystem.config.js
// Status:        pm2 status
// Logs:          pm2 logs sync-pago
// Salvar p/ boot: pm2 save  &&  pm2 startup
module.exports = {
    apps: [
        { name: 'sync-recebido', script: 'npm', args: 'run sync:recebido', cwd: __dirname, autorestart: true, max_restarts: 50, time: true },
        { name: 'sync-pago', script: 'npm', args: 'run sync:pago', cwd: __dirname, autorestart: true, max_restarts: 50, time: true },
        { name: 'sync-vendasrec', script: 'npm', args: 'run sync:vendasrec', cwd: __dirname, autorestart: true, max_restarts: 50, time: true },
        { name: 'sync-areceber', script: 'npm', args: 'run sync:areceber', cwd: __dirname, autorestart: true, max_restarts: 50, time: true },
    ],
}
