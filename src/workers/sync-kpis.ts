/* eslint-disable @typescript-eslint/no-explicit-any */
// Roda os 4 syncs da aba KPI'S UMA vez e encerra — pra atualizar manualmente
// no PC (ex.: npm run sync:kpis). Cada worker roda em SYNC_ONCE=1.
import { spawnSync } from 'child_process'
import path from 'path'

const workers = ['sync-recebido', 'sync-pago-apagar', 'sync-vendasrecebidas', 'sync-a-receber', 'sync-fluxo-caixa']

console.log('=== Atualizando consultas da KPI\'S (roda uma vez e encerra) ===\n')
let falhas = 0
for (const w of workers) {
    console.log(`\n----- ${w} -----`)
    const r = spawnSync('npx', ['tsx', path.join('src', 'workers', `${w}.ts`)], {
        stdio: 'inherit',
        env: { ...process.env, SYNC_ONCE: '1' },
        shell: true,
    })
    if (r.status !== 0) { falhas++; console.log(`  ⚠️  ${w} falhou (status ${r.status}).`) }
}

console.log(falhas === 0
    ? '\n✅ KPI\'S atualizada com sucesso.'
    : `\n⚠️  Concluído com ${falhas} falha(s) — confira os logs acima.`)
process.exit(falhas === 0 ? 0 : 1)
