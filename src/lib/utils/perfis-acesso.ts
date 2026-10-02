// =============================================================================
// Perfis de acesso do app — a lista fechada que aparece no cadastro de usuários.
//
// Cada perfil é só um atalho: ao salvar, as permissões reais são escritas nas
// tabelas de sempre, que são quem o middleware consulta:
//   permissoes_obras.papel        -> módulo Obras   (admin | editor | viewer)
//   permissao_modulocontrole      -> módulo Controle (linha = acesso; pode_editar)
//   visualizadores                -> Suprimentos limitado ao Board
// Sem linha em visualizadores, o usuário logado usa o Suprimentos inteiro.
// =============================================================================

export type PapelObras = 'admin' | 'editor' | 'viewer'
export type AcessoSuprimentos = 'completo' | 'board' | 'nenhum'

export interface Perfil {
    id: string
    nome: string
    descricao: string
    obras: PapelObras | null
    controle: { editar: boolean } | null
    suprimentos: AcessoSuprimentos
}

export const PERFIS: Perfil[] = [
    {
        id: 'admin',
        nome: 'Administrador',
        descricao: 'Tudo: Obras como admin (inclui Obras diretoria e cadastro de usuários), Controle com edição e Suprimentos completo.',
        obras: 'admin',
        controle: { editar: true },
        suprimentos: 'completo',
    },
    {
        id: 'engenharia',
        nome: 'Engenharia / Obras',
        descricao: 'Obras como editor (cria medição e programação) e Suprimentos completo. Sem acesso ao Controle.',
        obras: 'editor',
        controle: null,
        suprimentos: 'completo',
    },
    {
        id: 'engenharia_campo',
        nome: 'Engenharia (só Obras)',
        descricao: 'Obras como editor. No Suprimentos, vê apenas o Board. Sem acesso ao Controle.',
        obras: 'editor',
        controle: null,
        suprimentos: 'board',
    },
    {
        id: 'planejamento',
        nome: 'Planejamento',
        descricao: 'Obras como editor e Controle só leitura. No Suprimentos, vê apenas o Board.',
        obras: 'editor',
        controle: { editar: false },
        suprimentos: 'board',
    },
    {
        id: 'obras_leitura',
        nome: 'Obras (somente leitura)',
        descricao: 'Vê o módulo Obras sem criar nem editar nada. No Suprimentos, vê apenas o Board.',
        obras: 'viewer',
        controle: null,
        suprimentos: 'board',
    },
    {
        id: 'leitura_geral',
        nome: 'Leitura (Obras e Controle)',
        descricao: 'Vê Obras e Controle sem editar nada. No Suprimentos, vê apenas o Board.',
        obras: 'viewer',
        controle: { editar: false },
        suprimentos: 'board',
    },
    {
        id: 'financeiro',
        nome: 'Financeiro / Controle',
        descricao: 'Controle com edição (medições, cadastro de venda, fechamento). No Suprimentos, vê apenas o Board.',
        obras: null,
        controle: { editar: true },
        suprimentos: 'board',
    },
    {
        id: 'controle_leitura',
        nome: 'Controle (somente leitura)',
        descricao: 'Vê o módulo Controle sem editar. No Suprimentos, vê apenas o Board.',
        obras: null,
        controle: { editar: false },
        suprimentos: 'board',
    },
    {
        id: 'suprimentos',
        nome: 'Suprimentos / Compras',
        descricao: 'Usa o módulo Suprimentos inteiro (pedidos, cotações, board). Sem Obras e sem Controle.',
        obras: null,
        controle: null,
        suprimentos: 'completo',
    },
    {
        id: 'visualizador',
        nome: 'Visualizador (só Board)',
        descricao: 'Acompanha apenas o Board do Suprimentos. Não abre Obras nem Controle.',
        obras: null,
        controle: null,
        suprimentos: 'board',
    },
]

export const perfilPorId = (id: string | null | undefined) =>
    PERFIS.find(p => p.id === id) ?? null

/** Resumo curto do que o perfil libera, para a coluna da listagem. */
export function resumoPerfil(p: Perfil): string {
    const partes: string[] = []
    if (p.obras) partes.push(`Obras: ${p.obras === 'admin' ? 'admin' : p.obras === 'editor' ? 'editor' : 'leitura'}`)
    if (p.controle) partes.push(`Controle: ${p.controle.editar ? 'edita' : 'leitura'}`)
    partes.push(`Suprimentos: ${p.suprimentos === 'completo' ? 'completo' : p.suprimentos === 'board' ? 'só Board' : 'sem acesso'}`)
    return partes.join(' · ')
}
