-- Módulo Controle / aba KPI'S: espelho da consulta "A_receber" do UAU
-- (contas a receber por parcela + valores da venda).
-- Card "Faturado a Receber" = SUM(val_provisao_curto_ven)+SUM(val_desconto_imposto_ven)
-- onde num_parc_ger = '1'. Sem filtro de empresa/obra (a query traz todas).
CREATE TABLE IF NOT EXISTS public.controle_a_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra text,
  data_prc date,
  num_parc_ger text,
  val_provisao_curto_ven numeric,
  val_desconto_imposto_ven numeric,
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS controle_a_receber_obra_idx ON public.controle_a_receber (obra);
CREATE INDEX IF NOT EXISTS controle_a_receber_data_idx ON public.controle_a_receber (data_prc);
CREATE INDEX IF NOT EXISTS controle_a_receber_parcger_idx ON public.controle_a_receber (num_parc_ger);

ALTER TABLE public.controle_a_receber ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS controle_a_receber_select ON public.controle_a_receber;
CREATE POLICY controle_a_receber_select ON public.controle_a_receber
  FOR SELECT TO authenticated USING (true);
