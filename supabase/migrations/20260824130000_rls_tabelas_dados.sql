-- SEGURANÇA (parte 2): as tabelas de dados também estavam sem RLS, então a
-- chave anon (pública) lia e escrevia pedidos, fornecedores, obras e custos.
--
-- Padrão adotado, igual ao que já existe nas tabelas do Obras-Eng:
--   • quem está LOGADO tem acesso total (o gate por módulo/papel continua
--     sendo feito no middleware + UI, como já era);
--   • quem NÃO está logado (anon) não vê e não escreve nada.
-- Exceção: custo_uau e custo_materiais são espelho do UAU, alimentadas só pelo
-- worker (service_role ignora RLS) — no app são somente leitura.

-- ── Alimentadas pelo worker: somente leitura no app
ALTER TABLE public.custo_uau ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custo_uau_select ON public.custo_uau;
CREATE POLICY custo_uau_select ON public.custo_uau FOR SELECT TO authenticated USING (true);

ALTER TABLE public.custo_materiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custo_materiais_select ON public.custo_materiais;
CREATE POLICY custo_materiais_select ON public.custo_materiais FOR SELECT TO authenticated USING (true);

-- ── Mantidas pelo app: acesso total para autenticado
ALTER TABLE public.custo_orcamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custo_orcamento_all ON public.custo_orcamento;
CREATE POLICY custo_orcamento_all ON public.custo_orcamento FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pedidos_compra_all ON public.pedidos_compra;
CREATE POLICY pedidos_compra_all ON public.pedidos_compra FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS obras_all ON public.obras;
CREATE POLICY obras_all ON public.obras FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fornecedores_all ON public.fornecedores;
CREATE POLICY fornecedores_all ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.compradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compradores_all ON public.compradores;
CREATE POLICY compradores_all ON public.compradores FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cotacoes_all ON public.cotacoes;
CREATE POLICY cotacoes_all ON public.cotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alertas_all ON public.alertas;
CREATE POLICY alertas_all ON public.alertas FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.analises_5w2h ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analises_5w2h_all ON public.analises_5w2h;
CREATE POLICY analises_5w2h_all ON public.analises_5w2h FOR ALL TO authenticated USING (true) WITH CHECK (true);
