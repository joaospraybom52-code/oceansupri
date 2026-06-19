-- Baseline schema snapshot (schema public) gerado via introspecção pg_catalog
-- Projeto Supabase: aizcxfpkzaoaqkgxcmgp | gerado em 2026-06-19T00:37:58.671Z
-- NÃO é uma migration executável diretamente; é um retrato fiel do schema atual para referência/versionamento.

-- ============ ENUMS ============
CREATE TYPE public.status_fsm AS ENUM (
  'requisitado',
  'em_cotacao',
  'aguardando_aprovacao',
  'aprovado',
  'ordem_gerada',
  'em_transito',
  'aguardando_entrega',
  'entregue'
);

-- ============ TABELAS ============
CREATE TABLE public.alertas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid,
  comprador_id uuid,
  tipo text NOT NULL,
  mensagem text NOT NULL,
  lido boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.alertas ADD CONSTRAINT alertas_comprador_id_fkey FOREIGN KEY (comprador_id) REFERENCES compradores(id) ON DELETE CASCADE;
ALTER TABLE public.alertas ADD CONSTRAINT alertas_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE CASCADE;
ALTER TABLE public.alertas ADD CONSTRAINT alertas_pkey PRIMARY KEY (id);

CREATE TABLE public.analises_5w2h (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  tarefa_id uuid,
  restricao_id uuid,
  what_o_que text,
  why_por_que text,
  where_onde text,
  when_quando date,
  who_quem text,
  how_como text,
  how_much_quanto text
);
ALTER TABLE public.analises_5w2h ADD CONSTRAINT analises_5w2h_restricao_id_fkey FOREIGN KEY (restricao_id) REFERENCES restricoes(id) ON DELETE CASCADE;
ALTER TABLE public.analises_5w2h ADD CONSTRAINT analises_5w2h_tarefa_id_fkey FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE;
ALTER TABLE public.analises_5w2h ADD CONSTRAINT analises_5w2h_pkey PRIMARY KEY (id);

CREATE TABLE public.compradores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  email text,
  role text,
  auth_user_id uuid,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.compradores ADD CONSTRAINT compradores_pkey PRIMARY KEY (id);

CREATE TABLE public.cotacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid,
  fornecedor_id uuid,
  valor numeric NOT NULL,
  prazo_entrega_dias integer,
  condicao_pagamento text,
  observacoes text,
  selecionada boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.cotacoes ADD CONSTRAINT cotacoes_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL;
ALTER TABLE public.cotacoes ADD CONSTRAINT cotacoes_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE CASCADE;
ALTER TABLE public.cotacoes ADD CONSTRAINT cotacoes_pkey PRIMARY KEY (id);

CREATE TABLE public.fornecedores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  razao_social text NOT NULL,
  cnpj text,
  contato text,
  email text,
  telefone text,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.fornecedores ADD CONSTRAINT fornecedores_pkey PRIMARY KEY (id);

CREATE TABLE public.itens_orcamento (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  obra_id uuid,
  codigo text NOT NULL,
  descricao text NOT NULL,
  unidade text,
  quantidade_orcada numeric(15,4) DEFAULT 0,
  valor_unitario_orcado numeric(15,4) DEFAULT 0,
  valor_total_orcado numeric(15,4) DEFAULT 0,
  peso_percentual numeric(5,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.itens_orcamento ADD CONSTRAINT itens_orcamento_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES obras_eng(id) ON DELETE CASCADE;
ALTER TABLE public.itens_orcamento ADD CONSTRAINT itens_orcamento_pkey PRIMARY KEY (id);
ALTER TABLE public.itens_orcamento ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.medicao_itens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  medicao_id uuid,
  item_id uuid,
  quantidade_medida numeric(15,4) DEFAULT 0,
  valor_medido numeric(15,4) DEFAULT 0,
  percentual_medido numeric(5,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.medicao_itens ADD CONSTRAINT medicao_itens_item_id_fkey FOREIGN KEY (item_id) REFERENCES itens_orcamento(id) ON DELETE CASCADE;
ALTER TABLE public.medicao_itens ADD CONSTRAINT medicao_itens_medicao_id_fkey FOREIGN KEY (medicao_id) REFERENCES medicoes(id) ON DELETE CASCADE;
ALTER TABLE public.medicao_itens ADD CONSTRAINT medicao_itens_pkey PRIMARY KEY (id);
ALTER TABLE public.medicao_itens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.medicoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  obra_id uuid,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  status text DEFAULT 'Rascunho'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.medicoes ADD CONSTRAINT medicoes_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES obras_eng(id) ON DELETE CASCADE;
ALTER TABLE public.medicoes ADD CONSTRAINT medicoes_pkey PRIMARY KEY (id);
ALTER TABLE public.medicoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.obras (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  codigo text,
  endereco text,
  engenheiro_responsavel text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.obras ADD CONSTRAINT obras_pkey PRIMARY KEY (id);

CREATE TABLE public.obras_eng (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  status text DEFAULT 'Ativa'::text NOT NULL,
  data_inicio date,
  data_fim date,
  created_at timestamp with time zone DEFAULT now(),
  codigo_uau text,
  local text,
  previsao_inicio date,
  previsao_termino date
);
ALTER TABLE public.obras_eng ADD CONSTRAINT obras_eng_pkey PRIMARY KEY (id);
ALTER TABLE public.obras_eng ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pedidos_compra (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  obra_id uuid,
  comprador_id uuid,
  descricao_insumo text NOT NULL,
  categoria_cap text,
  status_fsm status_fsm DEFAULT 'requisitado'::status_fsm,
  valor_orcado numeric,
  valor_fechado numeric,
  valor_frete numeric,
  desconto_absoluto numeric,
  desconto_percentual numeric,
  solicitante_obra text,
  emergencial boolean DEFAULT false,
  data_requisicao timestamp with time zone,
  data_inicio_cotacao timestamp with time zone,
  data_envio_aprovacao timestamp with time zone,
  data_aprovacao_diretoria timestamp with time zone,
  data_ordem_compra timestamp with time zone,
  data_previsao_entrega timestamp with time zone,
  data_entrega_real timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  fornecedor_1_id uuid,
  fornecedor_1_valor_negociado numeric,
  fornecedor_1_valor_orcado numeric,
  fornecedor_2_id uuid,
  fornecedor_2_valor_negociado numeric,
  fornecedor_2_valor_orcado numeric,
  fornecedor_3_id uuid,
  fornecedor_3_valor_negociado numeric,
  fornecedor_3_valor_orcado numeric,
  fornecedor_vencedor integer,
  grupo_cotacao_id uuid,
  numero_ordem_compra text,
  numero_pedido text,
  codigo_uau text,
  justificativa_fornecedor text,
  data_saiu_entrega timestamp with time zone
);
ALTER TABLE public.pedidos_compra ADD CONSTRAINT pedidos_compra_comprador_id_fkey FOREIGN KEY (comprador_id) REFERENCES compradores(id) ON DELETE SET NULL;
ALTER TABLE public.pedidos_compra ADD CONSTRAINT pedidos_compra_fornecedor_1_id_fkey FOREIGN KEY (fornecedor_1_id) REFERENCES fornecedores(id);
ALTER TABLE public.pedidos_compra ADD CONSTRAINT pedidos_compra_fornecedor_2_id_fkey FOREIGN KEY (fornecedor_2_id) REFERENCES fornecedores(id);
ALTER TABLE public.pedidos_compra ADD CONSTRAINT pedidos_compra_fornecedor_3_id_fkey FOREIGN KEY (fornecedor_3_id) REFERENCES fornecedores(id);
ALTER TABLE public.pedidos_compra ADD CONSTRAINT pedidos_compra_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE SET NULL;
ALTER TABLE public.pedidos_compra ADD CONSTRAINT pedidos_compra_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX pedidos_compra_dedup_key ON public.pedidos_compra USING btree (numero_pedido, codigo_uau, descricao_insumo);

CREATE TABLE public.permissoes_obras (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.permissoes_obras ADD CONSTRAINT permissoes_obras_pkey PRIMARY KEY (id);
ALTER TABLE public.permissoes_obras ADD CONSTRAINT permissoes_obras_email_key UNIQUE (email);

CREATE TABLE public.programacoes_semanais (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  obra_id uuid,
  semana_referente_inicio date NOT NULL,
  semana_referente_fim date NOT NULL,
  ppc numeric(5,2) DEFAULT 0,
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  prazo_envio timestamp with time zone,
  data_envio timestamp with time zone,
  status_envio text DEFAULT 'pendente'::text,
  responsavel text
);
ALTER TABLE public.programacoes_semanais ADD CONSTRAINT programacoes_semanais_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES obras_eng(id) ON DELETE CASCADE;
ALTER TABLE public.programacoes_semanais ADD CONSTRAINT programacoes_semanais_pkey PRIMARY KEY (id);
ALTER TABLE public.programacoes_semanais ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.restricoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  obra_id uuid,
  descricao text NOT NULL,
  categoria text,
  data_identificacao date DEFAULT CURRENT_DATE NOT NULL,
  data_remocao date,
  status text DEFAULT 'Aberta'::text NOT NULL,
  responsavel text,
  created_at timestamp with time zone DEFAULT now(),
  tarefa_id uuid,
  programacao_id uuid,
  prazo_remocao date
);
ALTER TABLE public.restricoes ADD CONSTRAINT restricoes_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES obras_eng(id) ON DELETE CASCADE;
ALTER TABLE public.restricoes ADD CONSTRAINT restricoes_programacao_id_fkey FOREIGN KEY (programacao_id) REFERENCES programacoes_semanais(id) ON DELETE CASCADE;
ALTER TABLE public.restricoes ADD CONSTRAINT restricoes_tarefa_id_fkey FOREIGN KEY (tarefa_id) REFERENCES tarefas(id);
ALTER TABLE public.restricoes ADD CONSTRAINT restricoes_pkey PRIMARY KEY (id);
ALTER TABLE public.restricoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tarefas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  programacao_id uuid,
  descricao text NOT NULL,
  responsavel text,
  data_planejada date,
  status text DEFAULT 'Pendente'::text NOT NULL,
  motivo_nao_conclusao text,
  created_at timestamp with time zone DEFAULT now(),
  item_orcamento_id uuid
);
ALTER TABLE public.tarefas ADD CONSTRAINT tarefas_item_orcamento_id_fkey FOREIGN KEY (item_orcamento_id) REFERENCES itens_orcamento(id);
ALTER TABLE public.tarefas ADD CONSTRAINT tarefas_programacao_id_fkey FOREIGN KEY (programacao_id) REFERENCES programacoes_semanais(id) ON DELETE CASCADE;
ALTER TABLE public.tarefas ADD CONSTRAINT tarefas_pkey PRIMARY KEY (id);
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.visualizadores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  email text,
  auth_user_id uuid,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.visualizadores ADD CONSTRAINT visualizadores_pkey PRIMARY KEY (id);

-- ============ POLÍTICAS RLS ============
CREATE POLICY "Acesso total Itens Orc" ON public.itens_orcamento AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
CREATE POLICY "Acesso total Medicao Itens" ON public.medicao_itens AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
CREATE POLICY "Acesso total Medicoes" ON public.medicoes AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
CREATE POLICY "Acesso total Obras" ON public.obras_eng AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
CREATE POLICY "Acesso total Programacoes" ON public.programacoes_semanais AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
CREATE POLICY "Acesso total Restricoes" ON public.restricoes AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
CREATE POLICY "Acesso total Tarefas" ON public.tarefas AS PERMISSIVE FOR ALL TO authenticated
  USING (true);

-- ============ FUNÇÕES ============
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;
