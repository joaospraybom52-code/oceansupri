ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_1_id UUID REFERENCES public.fornecedores(id);
ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_2_id UUID REFERENCES public.fornecedores(id);
ALTER TABLE public.pedidos_compra ADD COLUMN fornecedor_3_id UUID REFERENCES public.fornecedores(id);
ALTER TABLE public.pedidos_compra ADD COLUMN valor_frete NUMERIC;
