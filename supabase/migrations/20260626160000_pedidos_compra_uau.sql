-- Board Suprimentos: campos preenchidos automaticamente pelo worker sync-compras
-- a partir da consulta do UAU.
ALTER TABLE public.pedidos_compra ADD COLUMN IF NOT EXISTS comprador_uau text;        -- UsuarioCompra (quem gerou a OC)
ALTER TABLE public.pedidos_compra ADD COLUMN IF NOT EXISTS data_em_cotacao timestamptz;   -- quando virou "Em cotação"
ALTER TABLE public.pedidos_compra ADD COLUMN IF NOT EXISTS data_ordem_gerada timestamptz; -- quando virou "Ordem Gerada"
