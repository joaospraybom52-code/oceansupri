-- Módulo Controle / aba KPI'S: agregação do PAGO_E_APAGAR (Despesas) por
-- DescrInsumo + Cliente, para as duas tabelas drill-down (insumo x cliente).
-- Alimentada pelo mesmo worker do pago (sync-pago-apagar).
CREATE TABLE IF NOT EXISTS public.controle_pago_insumo_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descrinsumo text,
  cliente text,
  vlr_at_pagar numeric,
  vlr_at_pago numeric,
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS controle_pago_ic_insumo_idx ON public.controle_pago_insumo_cliente (descrinsumo);
CREATE INDEX IF NOT EXISTS controle_pago_ic_cliente_idx ON public.controle_pago_insumo_cliente (cliente);

ALTER TABLE public.controle_pago_insumo_cliente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS controle_pago_ic_select ON public.controle_pago_insumo_cliente;
CREATE POLICY controle_pago_ic_select ON public.controle_pago_insumo_cliente
  FOR SELECT TO authenticated USING (true);
