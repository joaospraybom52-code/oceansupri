-- Board Suprimentos: card passa a mostrar quantidade x preço unitário por item.
-- qtd_pedido e preco_unitario vêm do UAU (ItensOrdemCompra.Qtde_Ioc / Preco_Ioc);
-- valor_fechado passa a ser o TOTAL do item (qtd x unitário), somável no card.
ALTER TABLE public.pedidos_compra ADD COLUMN IF NOT EXISTS qtd_pedido numeric;
ALTER TABLE public.pedidos_compra ADD COLUMN IF NOT EXISTS preco_unitario numeric;
