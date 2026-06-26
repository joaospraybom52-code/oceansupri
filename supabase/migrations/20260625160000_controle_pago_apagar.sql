-- Módulo Controle / aba KPI'S: espelho da consulta "PAGO_E_APAGAR" do UAU
-- (demonstrativo financeiro: pago, a pagar e comprometido por obra/data).
-- Materializa as chaves de relação/filtro (obra, data_movimento), o
-- TipoControle (Despesas/Receitas/DespSaida/RecEntrada) e os 3 valores que a
-- query expõe, atendendo os cards: Total Pago, Total A Pagar, Total Comprometido.
-- Filtros já aplicados pelo worker: Empresa 4 (Constrowins), Obra <> null, Obra <> 'DP'.
CREATE TABLE IF NOT EXISTS public.controle_pago_apagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra text,
  data_movimento date,
  tipo_controle text,
  vlr_at_pago numeric,
  vlr_at_pagar numeric,
  vlr_comp numeric,
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS controle_pago_apagar_obra_idx ON public.controle_pago_apagar (obra);
CREATE INDEX IF NOT EXISTS controle_pago_apagar_data_idx ON public.controle_pago_apagar (data_movimento);
CREATE INDEX IF NOT EXISTS controle_pago_apagar_tipo_idx ON public.controle_pago_apagar (tipo_controle);

ALTER TABLE public.controle_pago_apagar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS controle_pago_apagar_select ON public.controle_pago_apagar;
CREATE POLICY controle_pago_apagar_select ON public.controle_pago_apagar
  FOR SELECT TO authenticated USING (true);
