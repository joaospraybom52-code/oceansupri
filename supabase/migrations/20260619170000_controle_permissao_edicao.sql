-- Controle: separa quem pode EDITAR (cadastrar/editar/excluir) de quem só VISUALIZA.
-- Por padrão, e-mails liberados são apenas visualização (pode_editar = false).

ALTER TABLE public.permissao_modulocontrole
  ADD COLUMN IF NOT EXISTS pode_editar boolean NOT NULL DEFAULT false;

UPDATE public.permissao_modulocontrole
  SET pode_editar = true WHERE email = 'engjoao@constrowins.eng.br';

-- Enforce no banco: leitura para quem tem acesso ao módulo (já barrado pelo
-- middleware); escrita só para quem tem pode_editar = true.
ALTER TABLE public.controle_medicoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS controle_select ON public.controle_medicoes;
DROP POLICY IF EXISTS controle_insert ON public.controle_medicoes;
DROP POLICY IF EXISTS controle_update ON public.controle_medicoes;
DROP POLICY IF EXISTS controle_delete ON public.controle_medicoes;

CREATE POLICY controle_select ON public.controle_medicoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY controle_insert ON public.controle_medicoes
  FOR INSERT TO authenticated
  WITH CHECK (auth.email() IN (SELECT email FROM public.permissao_modulocontrole WHERE pode_editar = true));

CREATE POLICY controle_update ON public.controle_medicoes
  FOR UPDATE TO authenticated
  USING (auth.email() IN (SELECT email FROM public.permissao_modulocontrole WHERE pode_editar = true));

CREATE POLICY controle_delete ON public.controle_medicoes
  FOR DELETE TO authenticated
  USING (auth.email() IN (SELECT email FROM public.permissao_modulocontrole WHERE pode_editar = true));
