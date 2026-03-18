ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_1_valor_orcado NUMERIC;
ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_1_valor_negociado NUMERIC;
ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_2_valor_orcado NUMERIC;
ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_2_valor_negociado NUMERIC;
ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_3_valor_orcado NUMERIC;
ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_3_valor_negociado NUMERIC;
ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_vencedor INTEGER CHECK (fornecedor_vencedor IN (1, 2, 3));
ALTER TABLE public.pedidos_compra ADD COLUMN justificativa_fornecedor TEXT;
