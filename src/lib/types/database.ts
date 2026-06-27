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
                    cidade: string | null
                    codigo: string | null
                    created_at: string | null
                    endereco: string | null
                    engenheiro_responsavel: string | null
                    id: string
                    nome: string
                }
                Insert: {
                    ativo?: boolean | null
                    cidade?: string | null
                    codigo?: string | null
                    created_at?: string | null
                    endereco?: string | null
                    engenheiro_responsavel?: string | null
                    id?: string
                    nome: string
                }
                Update: {
                    ativo?: boolean | null
                    cidade?: string | null
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
                    data_saiu_entrega: string | null
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
                    justificativa_fornecedor: string | null
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
                    data_saiu_entrega?: string | null
                    desconto_absoluto?: number | null
                    desconto_percentual?: number | null
                    descricao_insumo: string
                    emergencial?: boolean | null
                    grupo_cotacao_id?: string | null
                    id?: string
                    justificativa_fornecedor?: string | null
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
                    data_saiu_entrega?: string | null
                    desconto_absoluto?: number | null
                    desconto_percentual?: number | null
                    descricao_insumo?: string
                    emergencial?: boolean | null
                    grupo_cotacao_id?: string | null
                    id?: string
                    justificativa_fornecedor?: string | null
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
                    previsao_inicio: string | null
                    previsao_termino: string | null
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
                    previsao_inicio?: string | null
                    previsao_termino?: string | null
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
                    previsao_inicio?: string | null
                    previsao_termino?: string | null
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
                    eh_pai: boolean
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
                    eh_pai?: boolean
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
                    eh_pai?: boolean
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
                    ppc: number | null
                    observacoes: string | null
                    prazo_envio: string | null
                    data_envio: string | null
                    status_envio: string | null
                    responsavel: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    obra_id?: string | null
                    semana_referente_inicio: string
                    semana_referente_fim: string
                    ppc?: number | null
                    observacoes?: string | null
                    prazo_envio?: string | null
                    data_envio?: string | null
                    status_envio?: string | null
                    responsavel?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    obra_id?: string | null
                    semana_referente_inicio?: string
                    semana_referente_fim?: string
                    ppc?: number | null
                    observacoes?: string | null
                    prazo_envio?: string | null
                    data_envio?: string | null
                    status_envio?: string | null
                    responsavel?: string | null
                    created_at?: string | null
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
                    status: string
                    motivo_nao_conclusao: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    programacao_id?: string | null
                    descricao: string
                    item_orcamento_id?: string | null
                    responsavel?: string | null
                    data_planejada?: string | null
                    status?: string
                    motivo_nao_conclusao?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    programacao_id?: string | null
                    descricao?: string
                    item_orcamento_id?: string | null
                    responsavel?: string | null
                    data_planejada?: string | null
                    status?: string
                    motivo_nao_conclusao?: string | null
                    created_at?: string | null
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
                    categoria: string | null
                    responsavel: string | null
                    data_identificacao: string
                    prazo_remocao: string | null
                    data_remocao: string | null
                    status: string
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    programacao_id?: string | null
                    obra_id?: string | null
                    tarefa_id?: string | null
                    descricao: string
                    categoria?: string | null
                    responsavel?: string | null
                    data_identificacao?: string
                    prazo_remocao?: string | null
                    data_remocao?: string | null
                    status?: string
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    programacao_id?: string | null
                    obra_id?: string | null
                    tarefa_id?: string | null
                    descricao?: string
                    categoria?: string | null
                    responsavel?: string | null
                    data_identificacao?: string
                    prazo_remocao?: string | null
                    data_remocao?: string | null
                    status?: string
                    created_at?: string | null
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
                    status: string
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
                    status?: string
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
                    status?: string
                }
                Relationships: []
            }
            permissoes_obras: {
                Row: {
                    id: string
                    email: string
                    papel: string
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    email: string
                    papel?: string
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    email?: string
                    papel?: string
                    created_at?: string | null
                }
                Relationships: []
            }
            controle_medicoes: {
                Row: {
                    id: string
                    obra_id: string | null
                    valor_medicao: number
                    mes_recebimento: string
                    tipo: string
                    nota_fiscal: string | null
                    observacoes: string | null
                    percentual_recebido: number | null
                    mes_recebimento_real: string | null
                    iss_percentual: number | null
                    inss_percentual: number | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    obra_id?: string | null
                    valor_medicao: number
                    mes_recebimento: string
                    tipo?: string
                    nota_fiscal?: string | null
                    observacoes?: string | null
                    percentual_recebido?: number | null
                    mes_recebimento_real?: string | null
                    iss_percentual?: number | null
                    inss_percentual?: number | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    obra_id?: string | null
                    valor_medicao?: number
                    mes_recebimento?: string
                    tipo?: string
                    nota_fiscal?: string | null
                    observacoes?: string | null
                    percentual_recebido?: number | null
                    mes_recebimento_real?: string | null
                    iss_percentual?: number | null
                    inss_percentual?: number | null
                    created_at?: string | null
                }
                Relationships: []
            }
            custo_uau: {
                Row: {
                    id: string
                    obra_plt: string
                    obra: string | null
                    empresa_plt: number | null
                    prod_plt: number | null
                    contrato_plt: number | null
                    item_plt: string | null
                    serv_plt: string | null
                    unid_plt: string | null
                    ins_cins: string | null
                    servico: string | null
                    insumo: string | null
                    unid_ins: string | null
                    valor_planej: number | null
                    valor_planej_ins: number | null
                    valor_aprov: number | null
                    valor_aprov_ins: number | null
                    saldo_vlr_vinc: number | null
                    saldo_vlr_vinc_ins: number | null
                    data_inicial: string | null
                    data_final: string | null
                    ordem: number | null
                    atualizado_em: string | null
                }
                Insert: { [k: string]: unknown }
                Update: { [k: string]: unknown }
                Relationships: []
            }
            custo_orcamento: {
                Row: {
                    id: string
                    obra_plt: string
                    item_plt: string
                    insumo: string
                    valor_planejado: number
                    atualizado_em: string | null
                }
                Insert: { [k: string]: unknown }
                Update: { [k: string]: unknown }
                Relationships: []
            }
            custo_materiais: {
                Row: {
                    id: string
                    obra_plt: string
                    item_plt: string | null
                    descr_ins: string | null
                    material: string | null
                    valor: number | null
                    ordem: number | null
                    atualizado_em: string | null
                }
                Insert: { [k: string]: unknown }
                Update: { [k: string]: unknown }
                Relationships: []
            }
            controle_recebido: {
                Row: {
                    id: string
                    obra_rec: string | null
                    tot_conf: number | null
                    data_rec: string | null
                    tot_desc: number | null
                    tot_princ: number | null
                    atualizado_em: string | null
                }
                Insert: {
                    id?: string
                    obra_rec?: string | null
                    tot_conf?: number | null
                    data_rec?: string | null
                    tot_desc?: number | null
                    tot_princ?: number | null
                    atualizado_em?: string | null
                }
                Update: {
                    id?: string
                    obra_rec?: string | null
                    tot_conf?: number | null
                    data_rec?: string | null
                    tot_desc?: number | null
                    tot_princ?: number | null
                    atualizado_em?: string | null
                }
                Relationships: []
            }
            controle_a_receber: {
                Row: {
                    id: string
                    obra: string | null
                    data_prc: string | null
                    num_parc_ger: string | null
                    val_provisao_curto_ven: number | null
                    val_desconto_imposto_ven: number | null
                    valor_prc: number | null
                    data_fim_contrato_ven: string | null
                    hist_lanc_ven: string | null
                    data_ven: string | null
                    atualizado_em: string | null
                }
                Insert: {
                    id?: string
                    obra?: string | null
                    data_prc?: string | null
                    num_parc_ger?: string | null
                    val_provisao_curto_ven?: number | null
                    val_desconto_imposto_ven?: number | null
                    valor_prc?: number | null
                    data_fim_contrato_ven?: string | null
                    hist_lanc_ven?: string | null
                    data_ven?: string | null
                    atualizado_em?: string | null
                }
                Update: {
                    id?: string
                    obra?: string | null
                    data_prc?: string | null
                    num_parc_ger?: string | null
                    val_provisao_curto_ven?: number | null
                    val_desconto_imposto_ven?: number | null
                    valor_prc?: number | null
                    data_fim_contrato_ven?: string | null
                    hist_lanc_ven?: string | null
                    data_ven?: string | null
                    atualizado_em?: string | null
                }
                Relationships: []
            }
            controle_pago_insumo_cliente: {
                Row: {
                    id: string
                    descrinsumo: string | null
                    cliente: string | null
                    data_movimento: string | null
                    vlr_at_pagar: number | null
                    vlr_at_pago: number | null
                    atualizado_em: string | null
                }
                Insert: {
                    id?: string
                    descrinsumo?: string | null
                    cliente?: string | null
                    data_movimento?: string | null
                    vlr_at_pagar?: number | null
                    vlr_at_pago?: number | null
                    atualizado_em?: string | null
                }
                Update: {
                    id?: string
                    descrinsumo?: string | null
                    cliente?: string | null
                    data_movimento?: string | null
                    vlr_at_pagar?: number | null
                    vlr_at_pago?: number | null
                    atualizado_em?: string | null
                }
                Relationships: []
            }
            controle_vendasrecebidas: {
                Row: {
                    id: string
                    obra_vrec: string | null
                    data_vrec: string | null
                    val_provisao_curto_vrec: number | null
                    val_desconto_imposto_vrec: number | null
                    atualizado_em: string | null
                }
                Insert: {
                    id?: string
                    obra_vrec?: string | null
                    data_vrec?: string | null
                    val_provisao_curto_vrec?: number | null
                    val_desconto_imposto_vrec?: number | null
                    atualizado_em?: string | null
                }
                Update: {
                    id?: string
                    obra_vrec?: string | null
                    data_vrec?: string | null
                    val_provisao_curto_vrec?: number | null
                    val_desconto_imposto_vrec?: number | null
                    atualizado_em?: string | null
                }
                Relationships: []
            }
            controle_pago_apagar: {
                Row: {
                    id: string
                    obra: string | null
                    data_movimento: string | null
                    tipo_controle: string | null
                    vlr_at_pago: number | null
                    vlr_at_pagar: number | null
                    vlr_comp: number | null
                    total_receita: number | null
                    atualizado_em: string | null
                }
                Insert: {
                    id?: string
                    obra?: string | null
                    data_movimento?: string | null
                    tipo_controle?: string | null
                    vlr_at_pago?: number | null
                    vlr_at_pagar?: number | null
                    vlr_comp?: number | null
                    total_receita?: number | null
                    atualizado_em?: string | null
                }
                Update: {
                    id?: string
                    obra?: string | null
                    data_movimento?: string | null
                    tipo_controle?: string | null
                    vlr_at_pago?: number | null
                    vlr_at_pagar?: number | null
                    vlr_comp?: number | null
                    total_receita?: number | null
                    atualizado_em?: string | null
                }
                Relationships: []
            }
            controle_vgv: {
                Row: {
                    id: string
                    codigo_obra: string | null
                    ano: number | null
                    nome_obra: string | null
                    cliente: string | null
                    valor_venda: number | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    codigo_obra?: string | null
                    ano?: number | null
                    nome_obra?: string | null
                    cliente?: string | null
                    valor_venda?: number | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    codigo_obra?: string | null
                    ano?: number | null
                    nome_obra?: string | null
                    cliente?: string | null
                    valor_venda?: number | null
                    created_at?: string | null
                }
                Relationships: []
            }
            permissao_modulocontrole: {
                Row: {
                    id: string
                    email: string
                    pode_editar: boolean
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    email: string
                    pode_editar?: boolean
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    email?: string
                    pode_editar?: boolean
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
export type ControleMedicao = Database["public"]["Tables"]["controle_medicoes"]["Row"]
export type CustoUau = Database["public"]["Tables"]["custo_uau"]["Row"]
export type PermissaoModuloControle = Database["public"]["Tables"]["permissao_modulocontrole"]["Row"]
export type ControleRecebido = Database["public"]["Tables"]["controle_recebido"]["Row"]
export type ControlePagoApagar = Database["public"]["Tables"]["controle_pago_apagar"]["Row"]
export type ControleVendasRecebidas = Database["public"]["Tables"]["controle_vendasrecebidas"]["Row"]
export type ControleAReceber = Database["public"]["Tables"]["controle_a_receber"]["Row"]
export type ControleVgv = Database["public"]["Tables"]["controle_vgv"]["Row"]
export type ControlePagoInsumoCliente = Database["public"]["Tables"]["controle_pago_insumo_cliente"]["Row"]

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
