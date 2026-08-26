-- Classificação MANUAL da linha da DRE Gerencial.
-- A DRE deduz a linha de cada movimento pela obra/origem (custo, estrutura,
-- diretoria, cartão...). Esta tabela permite ao usuário mandar um custo para
-- outra linha, sobrepondo a regra automática.
--
-- Escopo pela especificidade da chave (o mais específico vence):
--   obra + descr_comp + nominal  -> só aquele lançamento do drill
--   obra + descr_comp            -> toda aquela despesa da obra
--   obra                         -> a obra inteira
-- Segmento vazio ('') = coringa.
CREATE TABLE IF NOT EXISTS public.dre_gerencial_linha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra text NOT NULL,                        -- código da obra (MAIÚSCULO, trim)
  descr_comp text NOT NULL DEFAULT '',       -- '' = qualquer despesa da obra
  nominal text NOT NULL DEFAULT '',          -- '' = qualquer nominal da despesa
  linha text NOT NULL CHECK (linha IN (
    'receita','custo','cartao','estrutura','diretoria',
    'financeiro','emprestimo','entre_contas','ignorado')),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (obra, descr_comp, nominal)
);

CREATE INDEX IF NOT EXISTS idx_dre_ger_linha_obra ON public.dre_gerencial_linha (obra);

ALTER TABLE public.dre_gerencial_linha ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dre_ger_linha_select ON public.dre_gerencial_linha;
CREATE POLICY dre_ger_linha_select ON public.dre_gerencial_linha
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dre_ger_linha_write ON public.dre_gerencial_linha;
CREATE POLICY dre_ger_linha_write ON public.dre_gerencial_linha
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.permissao_modulocontrole p WHERE lower(p.email) = lower(auth.email()) AND p.pode_editar))
  WITH CHECK (EXISTS (SELECT 1 FROM public.permissao_modulocontrole p WHERE lower(p.email) = lower(auth.email()) AND p.pode_editar));
