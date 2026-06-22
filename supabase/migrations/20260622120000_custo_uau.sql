-- Acompanhamento de Custo: espelho da consulta "_665" do UAU (orçado x realizado
-- por item/serviço/insumo de cada obra). Atualizado periodicamente a partir do UAU.
CREATE TABLE IF NOT EXISTS public.custo_uau (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_plt text NOT NULL,
  obra text,
  empresa_plt integer,
  prod_plt integer,
  contrato_plt integer,
  item_plt text,
  serv_plt text,
  unid_plt text,
  ins_cins text,
  servico text,
  insumo text,
  unid_ins text,
  valor_planej numeric,
  valor_planej_ins numeric,
  valor_aprov numeric,
  valor_aprov_ins numeric,
  saldo_vlr_vinc numeric,
  saldo_vlr_vinc_ins numeric,
  data_inicial date,
  data_final date,
  ordem integer,
  atualizado_em timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS custo_uau_obra_idx ON public.custo_uau (obra_plt, ordem);
