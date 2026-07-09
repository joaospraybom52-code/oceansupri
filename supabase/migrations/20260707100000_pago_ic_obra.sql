-- Permite que o filtro de Código da obra também valha nas tabelas Insumos x
-- Clientes: a agregação insumo_cliente passa a guardar a obra.
ALTER TABLE public.controle_pago_insumo_cliente ADD COLUMN IF NOT EXISTS obra text;
CREATE INDEX IF NOT EXISTS controle_pago_ic_obra_idx ON public.controle_pago_insumo_cliente (obra);
