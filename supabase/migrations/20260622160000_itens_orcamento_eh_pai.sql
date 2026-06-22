-- Marca itens-pai (cabeçalhos de hierarquia) do orçamento, para exibição com
-- cores diferentes. Pai = linha sem unidade e sem quantidade na importação.
ALTER TABLE public.itens_orcamento
  ADD COLUMN IF NOT EXISTS eh_pai boolean NOT NULL DEFAULT false;
