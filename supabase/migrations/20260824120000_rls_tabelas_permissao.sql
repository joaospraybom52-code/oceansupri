-- SEGURANÇA: as três tabelas que controlam acesso estavam SEM RLS, então a
-- chave anon (pública, visível no bundle do site) conseguia LER e ACEITAVA
-- comandos de escrita — bastaria um UPDATE para alguém virar admin.
--
-- Regra: cada usuário só enxerga a PRÓPRIA linha; ninguém escreve pelo app.
-- A manutenção continua sendo feita à mão no painel do Supabase (postgres /
-- service_role ignoram RLS) e os workers também usam service_role.
--
-- Todos os acessos do app já filtram por e-mail do usuário logado
-- (middleware.ts, obras-access.ts, páginas do Controle, Sidebar, board),
-- então a política mais restritiva não quebra nada.

-- ── Obras-Eng: papel viewer/editor/admin
ALTER TABLE public.permissoes_obras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS permissoes_obras_select_propria ON public.permissoes_obras;
CREATE POLICY permissoes_obras_select_propria ON public.permissoes_obras
  FOR SELECT TO authenticated USING (auth.email() = email);

-- ── Controle: acesso e pode_editar
ALTER TABLE public.permissao_modulocontrole ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS permissao_controle_select_propria ON public.permissao_modulocontrole;
CREATE POLICY permissao_controle_select_propria ON public.permissao_modulocontrole
  FOR SELECT TO authenticated USING (auth.email() = email);

-- ── Suprimentos: quem é visualizador (restrito ao /board)
ALTER TABLE public.visualizadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS visualizadores_select_propria ON public.visualizadores;
CREATE POLICY visualizadores_select_propria ON public.visualizadores
  FOR SELECT TO authenticated USING (auth.email() = email);
