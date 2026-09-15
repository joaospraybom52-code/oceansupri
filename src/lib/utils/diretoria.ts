// Obras da DIRETORIA: aparecem só na aba "Obras diretoria" (admin) e são
// excluídas do Acompanhamento de Custo, que é visível para todo o módulo Obras.
//
// O worker sync-custo.ts repete essa lista numa const própria: ele é copiado
// sozinho para a VM Oracle (scp do .ts) e não enxerga src/lib.
export const OBRAS_DIRETORIA = ['ES001']

/** Filtro do PostgREST: `.not('obra_plt', 'in', foraDaDiretoria())` */
export const foraDaDiretoria = () => `(${OBRAS_DIRETORIA.join(',')})`
