CREATE TYPE status_fsm AS ENUM (
  'requisitado',
  'em_cotacao',
  'aguardando_aprovacao',
  'aprovado',
  'ordem_gerada',
  'em_transito',
  'aguardando_entrega',
  'entregue'
);

CREATE TABLE IF NOT EXISTS obras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    codigo TEXT,
    endereco TEXT,
    engenheiro_responsavel TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compradores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    role TEXT,
    auth_user_id UUID,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visualizadores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    auth_user_id UUID,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    razao_social TEXT NOT NULL,
    cnpj TEXT,
    contato TEXT,
    email TEXT,
    telefone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos_compra (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
    comprador_id UUID REFERENCES compradores(id) ON DELETE SET NULL,
    descricao_insumo TEXT NOT NULL,
    categoria_cap TEXT,
    status_fsm status_fsm DEFAULT 'requisitado',
    valor_orcado NUMERIC,
    valor_fechado NUMERIC,
    valor_frete NUMERIC,
    desconto_absoluto NUMERIC,
    desconto_percentual NUMERIC,
    solicitante_obra TEXT,
    emergencial BOOLEAN DEFAULT false,
    data_requisicao TIMESTAMPTZ,
    data_inicio_cotacao TIMESTAMPTZ,
    data_envio_aprovacao TIMESTAMPTZ,
    data_aprovacao_diretoria TIMESTAMPTZ,
    data_ordem_compra TIMESTAMPTZ,
    data_previsao_entrega TIMESTAMPTZ,
    data_entrega_real TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    fornecedor_1_id UUID REFERENCES fornecedores(id),
    fornecedor_1_valor_negociado NUMERIC,
    fornecedor_1_valor_orcado NUMERIC,
    fornecedor_2_id UUID REFERENCES fornecedores(id),
    fornecedor_2_valor_negociado NUMERIC,
    fornecedor_2_valor_orcado NUMERIC,
    fornecedor_3_id UUID REFERENCES fornecedores(id),
    fornecedor_3_valor_negociado NUMERIC,
    fornecedor_3_valor_orcado NUMERIC,
    fornecedor_vencedor INTEGER,
    grupo_cotacao_id UUID,
    numero_ordem_compra TEXT,
    numero_pedido TEXT,
    codigo_uau TEXT
);

CREATE TABLE IF NOT EXISTS cotacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_id UUID REFERENCES pedidos_compra(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
    valor NUMERIC NOT NULL,
    prazo_entrega_dias INTEGER,
    condicao_pagamento TEXT,
    observacoes TEXT,
    selecionada BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alertas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_id UUID REFERENCES pedidos_compra(id) ON DELETE CASCADE,
    comprador_id UUID REFERENCES compradores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lido BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
