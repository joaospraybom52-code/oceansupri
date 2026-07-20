-- Módulo Controle / aba DRE Sede: classificação dos insumos da ADMCO em
-- fixo / variavel / ignorado (empréstimos e juros ficam fora do DRE).
-- Editável pelo app (quem tem pode_editar no permissao_modulocontrole).
CREATE TABLE IF NOT EXISTS public.dre_sede_classificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo text NOT NULL UNIQUE, -- descrinsumo em MAIÚSCULAS (trim)
  tipo text NOT NULL CHECK (tipo IN ('fixo','variavel','ignorado')),
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.dre_sede_classificacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dre_class_select ON public.dre_sede_classificacao;
CREATE POLICY dre_class_select ON public.dre_sede_classificacao
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dre_class_write ON public.dre_sede_classificacao;
CREATE POLICY dre_class_write ON public.dre_sede_classificacao
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.permissao_modulocontrole p WHERE lower(p.email) = lower(auth.email()) AND p.pode_editar))
  WITH CHECK (EXISTS (SELECT 1 FROM public.permissao_modulocontrole p WHERE lower(p.email) = lower(auth.email()) AND p.pode_editar));
