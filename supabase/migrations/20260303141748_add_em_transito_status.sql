ALTER TYPE status_fsm ADD VALUE IF NOT EXISTS 'em_transito' AFTER 'ordem_gerada';
ALTER TABLE public.pedidos_compra ADD COLUMN data_saiu_entrega TIMESTAMP WITH TIME ZONE;
