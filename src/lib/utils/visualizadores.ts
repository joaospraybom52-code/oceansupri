// Visualizadores do módulo Suprimentos.
//
// Regra geral: quem está na tabela `visualizadores` só enxerga o Board — o
// middleware devolve qualquer outra rota para /board.
//
// EXCEÇÃO: os e-mails abaixo também podem abrir o Dashboard de KPIs
// (/analytics).
//
// ⚠️ Esta lista precisa valer nos DOIS lugares: no middleware (que é o portão
// de verdade) e na Sidebar (que decide se mostra o link). Ficava só na
// Sidebar, e por isso o link aparecia mas o middleware barrava — o usuário
// clicava e caía no Board. Por isso mora aqui, num só lugar.
export const VISUALIZADORES_COM_DASHBOARD = [
    'pedrohenrique@constrowins.eng.br',
]

/** Este visualizador pode abrir o Dashboard de KPIs do Suprimentos? */
export const podeVerDashboard = (email: string | null | undefined) =>
    VISUALIZADORES_COM_DASHBOARD.includes((email ?? '').trim().toLowerCase())

/** Rotas que um visualizador com dashboard pode abrir além do Board. */
export const ROTAS_DASHBOARD = ['/analytics']
