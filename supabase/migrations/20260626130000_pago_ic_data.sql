-- Permite que o filtro de Ano/Mês também valha nas tabelas Insumos x Clientes:
-- a agregação insumo_cliente passa a guardar o mês (data_movimento = 1º do mês).
ALTER TABLE public.controle_pago_insumo_cliente ADD COLUMN IF NOT EXISTS data_movimento date;
CREATE INDEX IF NOT EXISTS controle_pago_ic_data_idx ON public.controle_pago_insumo_cliente (data_movimento);
