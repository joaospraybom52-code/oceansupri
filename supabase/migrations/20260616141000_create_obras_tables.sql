-- Criação das tabelas do módulo Obras de Engenharia

-- 1. Obras
CREATE TABLE obras_eng (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Ativa',
    data_inicio DATE,
    data_fim DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Itens do Orçamento (EAP)
CREATE TABLE itens_orcamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras_eng(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    unidade TEXT,
    quantidade_orcada NUMERIC(15,4) DEFAULT 0,
    valor_unitario_orcado NUMERIC(15,4) DEFAULT 0,
    valor_total_orcado NUMERIC(15,4) DEFAULT 0,
    peso_percentual NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Medições (Agrupamento Mensal/Quinzenal)
CREATE TABLE medicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras_eng(id) ON DELETE CASCADE,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Rascunho',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Itens da Medição (Controle Físico/Financeiro por item)
CREATE TABLE medicao_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicao_id UUID REFERENCES medicoes(id) ON DELETE CASCADE,
    item_id UUID REFERENCES itens_orcamento(id) ON DELETE CASCADE,
    quantidade_medida NUMERIC(15,4) DEFAULT 0,
    valor_medido NUMERIC(15,4) DEFAULT 0,
    percentual_medido NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Programações Semanais (Last Planner / Lean)
CREATE TABLE programacoes_semanais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras_eng(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    ppc NUMERIC(5,2) DEFAULT 0, -- Percentual de Planos Concluídos
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tarefas (Programação Semanal)
CREATE TABLE tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programacao_id UUID REFERENCES programacoes_semanais(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    responsavel TEXT,
    data_prevista DATE,
    status TEXT NOT NULL DEFAULT 'Pendente', -- Pendente, Concluída, Atrasada
    motivo_nao_conclusao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Restrições
CREATE TABLE restricoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras_eng(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    tipo TEXT, -- Ex: Projeto, Material, Mão de Obra, Equipamento
    data_identificacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_resolucao DATE,
    status TEXT NOT NULL DEFAULT 'Aberta', -- Aberta, Resolvida
    responsavel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Análises de Causa Raiz (5 Porquês) para tarefas não concluídas
CREATE TABLE analises_5porques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id UUID REFERENCES tarefas(id) ON DELETE CASCADE,
    problema TEXT NOT NULL,
    porque_1 TEXT,
    porque_2 TEXT,
    porque_3 TEXT,
    porque_4 TEXT,
    porque_5 TEXT,
    acao_corretiva TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de Segurança (RLS) - Permitindo acesso total para usuários autenticados por enquanto
-- Ajustar conforme necessário depois para roles específicas

ALTER TABLE obras_eng ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE programacoes_semanais ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises_5porques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total Obras" ON obras_eng FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total Itens Orc" ON itens_orcamento FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total Medicoes" ON medicoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total Medicao Itens" ON medicao_itens FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total Programacoes" ON programacoes_semanais FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total Tarefas" ON tarefas FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total Restricoes" ON restricoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total 5Porques" ON analises_5porques FOR ALL TO authenticated USING (true);
