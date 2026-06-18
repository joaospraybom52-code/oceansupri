export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            alertas: {
                Row: {
                    comprador_id: string | null
                    created_at: string | null
                    id: string
                    lido: boolean | null
                    mensagem: string
                    pedido_id: string | null
                    tipo: string
                }
                Insert: {
                    comprador_id?: string | null
                    created_at?: string | null
                    id?: string
                    lido?: boolean | null
                    mensagem: string
                    pedido_id?: string | null
                    tipo: string
                }
                Update: {
                    comprador_id?: string | null
                    created_at?: string | null
                    id?: string
                    lido?: boolean | null
                    mensagem?: string
                    pedido_id?: string | null
                    tipo?: string
                }
                Relationships: []
            }
            compradores: {
                Row: {
                    ativo: boolean | null
                    auth_user_id: string | null
                    created_at: string | null
                    email: string | null
                    id: string
                    nome: string
                    role: string | null
                }
                Insert: {
                    ativo?: boolean | null
                    auth_user_id?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    nome: string
                    role?: string | null
                }
                Update: {
                    ativo?: boolean | null
                    auth_user_id?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    nome?: string
                    role?: string | null
                }
                Relationships: []
            }
            cotacoes: {
                Row: {
                    condicao_pagamento: string | null
                    created_at: string | null
                    fornecedor_id: string | null
                    id: string
                    observacoes: string | null
                    pedido_id: string | null
                    prazo_entrega_dias: number | null
                    selecionada: boolean | null
                    valor: number
                }
                Insert: {
                    condicao_pagamento?: string | null
                    created_at?: string | null
                    fornecedor_id?: string | null
                    id?: string
                    observacoes?: string | null
                    pedido_id?: string | null
                    prazo_entrega_dias?: number | null
                    selecionada?: boolean | null
                    valor: number
                }
                Update: {
                    condicao_pagamento?: string | null
                    created_at?: string | null
                    fornecedor_id?: string | null
                    id?: string
                    observacoes?: string | null
                    pedido_id?: string | null
                    prazo_entrega_dias?: number | null
                    selecionada?: boolean | null
                    valor?: number
                }
                Relationships: []
            }
            fornecedores: {
                Row: {
                    cnpj: string | null
                    contato: string | null
                    created_at: string | null
                    email: string | null
                    id: string
                    razao_social: string
                    telefone: string | null
                }
                Insert: {
                    cnpj?: string | null
                    contato?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    razao_social: string
                    telefone?: string | null
                }
                Update: {
                    cnpj?: string | null
                    contato?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    razao_social?: string
                    telefone?: string | null
                }
                Relationships: []
            }
            obras: {
                Row: {
                    ativo: boolean | null
                    codigo: string | null
                    created_at: string | null
                    endereco: string | null
                    engenheiro_responsavel: string | null
                    id: string
                    nome: string
                }
                Insert: {
                    ativo?: boolean | null
                    codigo?: string | null
                    created_at?: string | null
                    endereco?: string | null
                    engenheiro_responsavel?: string | null
                    id?: string
                    nome: string
                }
                Update: {
                    ativo?: boolean | null
                    codigo?: string | null
                    created_at?: string | null
                    endereco?: string | null
                    engenheiro_responsavel?: string | null
                    id?: string
                    nome?: string
                }
                Relationships: []
            }
            visualizadores: {
                Row: {
                    ativo: boolean | null
                    auth_user_id: string | null
                    created_at: string | null
                    email: string | null
                    id: string
                    nome: string
                }
                Insert: {
                    ativo?: boolean | null
                    auth_user_id?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    nome: string
                }
                Update: {
                    ativo?: boolean | null
                    auth_user_id?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    nome?: string
                }
                Relationships: []
            }
            pedidos_compra: {
                Row: {
                    categoria_cap: string | null
                    codigo_uau: string | null
                    comprador_id: string | null
                    created_at: string | null
                    data_aprovacao_diretoria: string | null
                    data_entrega_real: string | null
                    data_envio_aprovacao: string | null
                    data_inicio_cotacao: string | null
                    data_ordem_compra: string | null
                    data_previsao_entrega: string | null
                    data_requisicao: string | null
                    desconto_absoluto: number | null
                    desconto_percentual: number | null
                    descricao_insumo: string
                    emergencial: boolean | null
                    fornecedor_1_id: string | null
                    fornecedor_1_valor_negociado: number | null
                    fornecedor_1_valor_orcado: number | null
                    fornecedor_2_id: string | null
                    fornecedor_2_valor_negociado: number | null
                    fornecedor_2_valor_orcado: number | null
                    fornecedor_3_id: string | null
                    fornecedor_3_valor_negociado: number | null
                    fornecedor_3_valor_orcado: number | null
                    fornecedor_vencedor: number | null
                    grupo_cotacao_id: string | null
                    id: string
                    numero_ordem_compra: string | null
                    numero_pedido: string | null
                    obra_id: string | null
                    solicitante_obra: string | null
                    status_fsm: Database["public"]["Enums"]["status_fsm"] | null
                    updated_at: string | null
                    valor_fechado: number | null
                    valor_frete: number | null
                    valor_orcado: number | null
                }
                Insert: {
                    categoria_cap?: string | null
                    codigo_uau?: string | null
                    comprador_id?: string | null
                    created_at?: string | null
                    data_aprovacao_diretoria?: string | null
                    data_entrega_real?: string | null
                    data_envio_aprovacao?: string | null
                    data_inicio_cotacao?: string | null
                    data_ordem_compra?: string | null
                    data_previsao_entrega?: string | null
                    data_requisicao?: string | null
                    desconto_absoluto?: number | null
                    desconto_percentual?: number | null
                    descricao_insumo: string
                    emergencial?: boolean | null
                    grupo_cotacao_id?: string | null
                    id?: string
                    numero_ordem_compra?: string | null
                    numero_pedido?: string | null
                    obra_id?: string | null
                    solicitante_obra?: string | null
                    status_fsm?: Database["public"]["Enums"]["status_fsm"] | null
                    updated_at?: string | null
                    valor_fechado?: number | null
                    valor_orcado?: number | null
                }
                Update: {
                    categoria_cap?: string | null
                    codigo_uau?: string | null
                    comprador_id?: string | null
                    created_at?: string | null
                    data_aprovacao_diretoria?: string | null
                    data_entrega_real?: string | null
                    data_envio_aprovacao?: string | null
                    data_inicio_cotacao?: string | null
                    data_ordem_compra?: string | null
                    data_previsao_entrega?: string | null
                    data_requisicao?: string | null
                    desconto_absoluto?: number | null
                    desconto_percentual?: number | null
                    descricao_insumo?: string
                    emergencial?: boolean | null
                    grupo_cotacao_id?: string | null
                    id?: string
                    numero_ordem_compra?: string | null
                    numero_pedido?: string | null
                    obra_id?: string | null
                    solicitante_obra?: string | null
                    status_fsm?: Database["public"]["Enums"]["status_fsm"] | null
                    updated_at?: string | null
                    valor_fechado?: number | null
                    valor_orcado?: number | null
                }
                Relationships: []
            }
            obras_eng: {
                Row: {
                    id: string
                    nome: string
                    status: string
                    data_inicio: string | null
                    data_fim: string | null
                    created_at: string | null
                    codigo_uau: string | null
                    local: string | null
                }
                Insert: {
                    id?: string
                    nome: string
                    status?: string
                    data_inicio?: string | null
                    data_fim?: string | null
                    created_at?: string | null
                    codigo_uau?: string | null
                    local?: string | null
                }
                Update: {
                    id?: string
                    nome?: string
                    status?: string
                    data_inicio?: string | null
                    data_fim?: string | null
                    created_at?: string | null
                    codigo_uau?: string | null
                    local?: string | null
                }
                Relationships: []
            }
            itens_orcamento: {
                Row: {
                    id: string
                    obra_id: string | null
                    codigo: string
                    descricao: string
                    unidade: string | null
                    quantidade_orcada: number | null
                    valor_unitario_orcado: number | null
                    valor_total_orcado: number | null
                    peso_percentual: number | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    obra_id?: string | null
                    codigo: string
                    descricao: string
                    unidade?: string | null
                    quantidade_orcada?: number | null
                    valor_unitario_orcado?: number | null
                    valor_total_orcado?: number | null
                    peso_percentual?: number | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    obra_id?: string | null
                    codigo?: string
                    descricao?: string
                    unidade?: string | null
                    quantidade_orcada?: number | null
                    valor_unitario_orcado?: number | null
                    valor_total_orcado?: number | null
                    peso_percentual?: number | null
                    created_at?: string | null
                }
                Relationships: []
            }
            medicoes: {
                Row: {
                    id: string
                    obra_id: string | null
                    periodo_inicio: string
                    periodo_fim: string
                    status: string
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    obra_id?: string | null
                    periodo_inicio: string
                    periodo_fim: string
                    status?: string
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    obra_id?: string | null
                    periodo_inicio?: string
                    periodo_fim?: string
                    status?: string
                    created_at?: string | null
                }
                Relationships: []
            }
            medicao_itens: {
                Row: {
                    id: string
                    medicao_id: string | null
                    item_id: string | null
                    quantidade_medida: number | null
                    valor_medido: number | null
                    percentual_medido: number | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    medicao_id?: string | null
                    item_id?: string | null
                    quantidade_medida?: number | null
                    valor_medido?: number | null
                    percentual_medido?: number | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    medicao_id?: string | null
                    item_id?: string | null
                    quantidade_medida?: number | null
                    valor_medido?: number | null
                    percentual_medido?: number | null
                    created_at?: string | null
                }
                Relationships: []
            }
            programacoes_semanais: {
                Row: {
                    id: string
                    obra_id: string | null
                    semana_referente_inicio: string
                    semana_referente_fim: string
                    prazo_envio: string
                    data_envio: string | null
                    status_envio: string | null
                    responsavel: string | null
                    created_at: string | null
                    updated_at: string | null
                    created_by: string | null
                }
                Insert: {
                    id?: string
                    obra_id?: string | null
                    semana_referente_inicio: string
                    semana_referente_fim: string
                    prazo_envio: string
                    data_envio?: string | null
                    status_envio?: string | null
                    responsavel?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                    created_by?: string | null
                }
                Update: {
                    id?: string
                    obra_id?: string | null
                    semana_referente_inicio?: string
                    semana_referente_fim?: string
                    prazo_envio?: string
                    data_envio?: string | null
                    status_envio?: string | null
                    responsavel?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                    created_by?: string | null
                }
                Relationships: []
            }
            tarefas: {
                Row: {
                    id: string
                    programacao_id: string | null
                    descricao: string
                    item_orcamento_id: string | null
                    responsavel: string | null
                    data_planejada: string | null
                    status: string | null
                    motivo_nao_conclusao: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    programacao_id?: string | null
                    descricao: string
                    item_orcamento_id?: string | null
                    responsavel?: string | null
                    data_planejada?: string | null
                    status?: string | null
                    motivo_nao_conclusao?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    programacao_id?: string | null
                    descricao?: string
                    item_orcamento_id?: string | null
                    responsavel?: string | null
                    data_planejada?: string | null
                    status?: string | null
                    motivo_nao_conclusao?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            restricoes: {
                Row: {
                    id: string
                    programacao_id: string | null
                    obra_id: string | null
                    tarefa_id: string | null
                    descricao: string
                    categoria: string
                    responsavel: string | null
                    data_identificacao: string
                    prazo_remocao: string
                    data_remocao: string | null
                    status: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    programacao_id?: string | null
                    obra_id?: string | null
                    tarefa_id?: string | null
                    descricao: string
                    categoria: string
                    responsavel?: string | null
                    data_identificacao: string
                    prazo_remocao: string
                    data_remocao?: string | null
                    status?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    programacao_id?: string | null
                    obra_id?: string | null
                    tarefa_id?: string | null
                    descricao?: string
                    categoria?: string
                    responsavel?: string | null
                    data_identificacao?: string
                    prazo_remocao?: string
                    data_remocao?: string | null
                    status?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            analises_5w2h: {
                Row: {
                    id: string
                    created_at: string | null
                    tarefa_id: string | null
                    restricao_id: string | null
                    what_o_que: string | null
                    why_por_que: string | null
                    where_onde: string | null
                    when_quando: string | null
                    who_quem: string | null
                    how_como: string | null
                    how_much_quanto: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    tarefa_id?: string | null
                    restricao_id?: string | null
                    what_o_que?: string | null
                    why_por_que?: string | null
                    where_onde?: string | null
                    when_quando?: string | null
                    who_quem?: string | null
                    how_como?: string | null
                    how_much_quanto?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    tarefa_id?: string | null
                    restricao_id?: string | null
                    what_o_que?: string | null
                    why_por_que?: string | null
                    where_onde?: string | null
                    when_quando?: string | null
                    who_quem?: string | null
                    how_como?: string | null
                    how_much_quanto?: string | null
                }
                Relationships: []
            }
            permissoes_obras: {
                Row: {
                    id: string
                    email: string
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    email: string
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    email?: string
                    created_at?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            status_fsm:
            | "requisitado"
            | "em_cotacao"
            | "aguardando_aprovacao"
            | "aprovado"
            | "ordem_gerada"
            | "em_transito"
            | "aguardando_entrega"
            | "entregue"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// =============================================
// Custom Application Types (used by components)
// =============================================

export type StatusFSM = Database["public"]["Enums"]["status_fsm"]

export type Obra = Database["public"]["Tables"]["obras"]["Row"]
export type Comprador = Database["public"]["Tables"]["compradores"]["Row"]
export type Visualizador = Database["public"]["Tables"]["visualizadores"]["Row"]
export type Fornecedor = Database["public"]["Tables"]["fornecedores"]["Row"]
export type Alerta = Database["public"]["Tables"]["alertas"]["Row"]

export type ObraEng = Database["public"]["Tables"]["obras_eng"]["Row"]
export type ItemOrcamento = Database["public"]["Tables"]["itens_orcamento"]["Row"]
export type Medicao = Database["public"]["Tables"]["medicoes"]["Row"]
export type MedicaoItem = Database["public"]["Tables"]["medicao_itens"]["Row"]
export type ProgramacaoSemanal = Database["public"]["Tables"]["programacoes_semanais"]["Row"]
export type Tarefa = Database["public"]["Tables"]["tarefas"]["Row"]
export type Restricao = Database["public"]["Tables"]["restricoes"]["Row"]
export type Analise5w2h = Database["public"]["Tables"]["analises_5w2h"]["Row"]
export type PermissaoObra = Database["public"]["Tables"]["permissoes_obras"]["Row"]

// PedidoCompra with joined relations
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PedidoCompra {
    id: string
    obra_id: string | null
    comprador_id: string | null
    fornecedor_1_id: string | null
    fornecedor_1_valor_negociado: number | null
    fornecedor_1_valor_orcado: number | null
    fornecedor_2_id: string | null
    fornecedor_2_valor_negociado: number | null
    fornecedor_2_valor_orcado: number | null
    fornecedor_3_id: string | null
    fornecedor_3_valor_negociado: number | null
    fornecedor_3_valor_orcado: number | null
    fornecedor_vencedor: number | null
    grupo_cotacao_id: string | null
    numero_ordem_compra: string | null
    justificativa_fornecedor: string | null
    numero_pedido: string | null
    codigo_uau: string | null
    descricao_insumo: string
    categoria_cap: string | null
    status_fsm: StatusFSM | null
    valor_orcado: number | null
    valor_fechado: number | null
    valor_frete: number | null
    desconto_absoluto: number | null
    desconto_percentual: number | null
    solicitante_obra: string | null
    emergencial: boolean | null
    data_requisicao: string | null
    data_inicio_cotacao: string | null
    data_envio_aprovacao: string | null
    data_aprovacao_diretoria: string | null
    data_ordem_compra: string | null
    data_saiu_entrega: string | null
    data_previsao_entrega: string | null
    data_entrega_real: string | null
    created_at: string | null
    updated_at: string | null
    obra?: Obra | null
    comprador?: Comprador | null
}

export interface Cotacao {
    id: string
    pedido_id: string | null
    fornecedor_id: string | null
    valor: number
    prazo_entrega_dias: number | null
    condicao_pagamento: string | null
    observacoes: string | null
    selecionada: boolean | null
    created_at: string | null
    fornecedor?: Fornecedor | null
}

// KPI Types
export interface KPISaving {
    saving_absoluto_total: number
    saving_percentual_medio: number
}

export interface KPILeadTime {
    lead_time_medio_total: number
}

export interface KPIVolume {
    cotacoes_por_comprador: { comprador_nome: string; total: number }[]
    percentual_emergenciais: number
    total_pedidos: number
}
