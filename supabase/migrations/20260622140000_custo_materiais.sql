-- Drill-down do custo: materiais (desembolso) que compõem o custo realizado de
-- cada insumo. Origem UAU (vwDesembolso). Atualizado junto com custo_uau.
CREATE TABLE IF NOT EXISTS public.custo_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_plt text NOT NULL,
  item_plt text,
  serv_plt text,
  ins_cins text,         -- código do insumo — casa com custo_uau.ins_cins (item+ins_cins)
  descr_ins text,        -- descrição do insumo (UPPER)
  material text,         -- DescItemProc_Des (material do desembolso)
  valor numeric,         -- SUM(TotalLiq_Des) do material (mesma fonte da coluna Custo)
  ordem integer,
  atualizado_em timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS custo_materiais_idx ON public.custo_materiais (obra_plt, item_plt, descr_ins);
