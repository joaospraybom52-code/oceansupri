-- Módulo Controle / Painel de Recebimentos: Fluxo de Caixa Diário.
-- Espelho da consulta de créditos (recebimentos previstos/prorrogados, Status_Rpg=1)
-- x débitos (pagos, StatusParc=2) do UAU, agregado por obra + dia + fornecedor.
-- Alimentada pelo worker sync-fluxo-caixa (roda junto do sync:kpis).
CREATE TABLE IF NOT EXISTS public.fluxo_caixa_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra text,
  data date,
  fornecedor text,
  credito numeric DEFAULT 0,
  debito numeric DEFAULT 0,
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fluxo_caixa_diario_data_idx ON public.fluxo_caixa_diario (data);
CREATE INDEX IF NOT EXISTS fluxo_caixa_diario_obra_idx ON public.fluxo_caixa_diario (obra);

ALTER TABLE public.fluxo_caixa_diario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fluxo_caixa_diario_select ON public.fluxo_caixa_diario;
CREATE POLICY fluxo_caixa_diario_select ON public.fluxo_caixa_diario
  FOR SELECT TO authenticated USING (true);
