-- Módulo Controle / aba KPI'S: espelho da consulta "recebido" do UAU.
-- Guarda apenas as colunas necessárias para os cards/relações:
--   obra_rec  -> código da obra (chave de relação/filtro com as demais tabelas)
--   tot_conf  -> medida "Total Recebido Real" = SUM(tot_conf)
--   data_rec  -> data do recebimento (chave de relação/filtro por período)
-- Atualizada periodicamente pelo worker sync-recebido.ts (delete + insert).
CREATE TABLE IF NOT EXISTS public.controle_recebido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_rec text,
  tot_conf numeric,
  data_rec date,
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS controle_recebido_obra_idx ON public.controle_recebido (obra_rec);
CREATE INDEX IF NOT EXISTS controle_recebido_data_idx ON public.controle_recebido (data_rec);

-- Leitura liberada para usuários autenticados (escrita só via service role do worker).
ALTER TABLE public.controle_recebido ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS controle_recebido_select ON public.controle_recebido;
CREATE POLICY controle_recebido_select ON public.controle_recebido
  FOR SELECT TO authenticated USING (true);
