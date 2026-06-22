-- Planejado FIXO do orçamento (origem: planilha Excel), por insumo de cada obra.
-- Separado de custo_uau (que é atualizado do UAU a cada 5 min): o planejado reflete
-- o orçamento do início e não deve ser sobrescrito pelo refresh do UAU.
CREATE TABLE IF NOT EXISTS public.custo_orcamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_plt text NOT NULL,
  item_plt text NOT NULL,
  insumo text NOT NULL,
  valor_planejado numeric NOT NULL DEFAULT 0,
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (obra_plt, item_plt, insumo)
);
