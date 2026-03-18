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
export type Fornecedor = Database["public"]["Tables"]["fornecedores"]["Row"]
export type Alerta = Database["public"]["Tables"]["alertas"]["Row"]

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
