-- Card "Controle Financeiro Saída" = SUM(TotalReceita) WHERE TipoControle='DespSaida'.
-- A coluna TotalReceita não existia na tabela espelho; adicionada aqui.
ALTER TABLE public.controle_pago_apagar ADD COLUMN IF NOT EXISTS total_receita numeric;
