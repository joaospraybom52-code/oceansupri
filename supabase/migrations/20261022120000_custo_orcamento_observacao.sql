-- Observação do valor planejado: quando o admin altera o Planejado de um insumo
-- no Acompanhamento de Custo, pode anotar o porquê (pedido do usuário em
-- 22/10/2026: "para eu lembrar depois"). Guarda também quem alterou e quando.
alter table custo_orcamento add column if not exists observacao text;
alter table custo_orcamento add column if not exists alterado_por text;
alter table custo_orcamento add column if not exists alterado_em timestamptz;
