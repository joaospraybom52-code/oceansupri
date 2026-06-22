-- Drill-down do custo: materiais (desembolso) que compõem o custo realizado de
-- cada insumo. Origem UAU (vwDesembolso). Atualizado junto com custo_uau.
CREATE TABLE IF NOT EXISTS public.custo_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_plt text NOT NULL,
  item_plt text,
  descr_ins text,        -- insumo (UPPER) — casa com custo_uau.insumo
  material text,         -- DescItemProc_Des (material pedido)
  valor numeric,         -- Aprovado (TotalLiq_Des) do material
  ordem integer,
  atualizado_em timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS custo_materiais_idx ON public.custo_materiais (obra_plt, item_plt, descr_ins);
