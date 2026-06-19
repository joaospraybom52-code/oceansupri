-- Adiciona colunas que o app já usava mas não existiam no banco, causando
-- falha silenciosa no UPDATE de pedidos_compra (PedidoModal/StageTransitionModal).
-- justificativa_fornecedor: justificativa da escolha do fornecedor vencedor.
-- data_saiu_entrega: data em que a ordem saiu para entrega.
ALTER TABLE public.pedidos_compra
  ADD COLUMN IF NOT EXISTS justificativa_fornecedor text,
  ADD COLUMN IF NOT EXISTS data_saiu_entrega timestamptz;
