-- Blindagem contra duplicação de cards entre o robô principal (NAS) e a worker
-- de reconciliação (Oracle): garante no banco que não existem dois pedidos com
-- a mesma chave de deduplicação numero_pedido + codigo_uau + descricao_insumo.
-- (Ambas as workers já checam antes de inserir; isto cobre a corrida entre elas.)
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_compra_dedup_key
  ON public.pedidos_compra (numero_pedido, codigo_uau, descricao_insumo);
