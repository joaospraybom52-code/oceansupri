-- Módulo Controle / aba "Cadastro de venda": tabela VGV (Valor Geral de Vendas).
-- Tabela MANUAL (cadastro pelo app, igual controle_medicoes). Seed inicial vindo
-- da planilha do usuário.
CREATE TABLE IF NOT EXISTS public.controle_vgv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_obra text,
  ano integer,
  nome_obra text,
  cliente text,
  valor_venda numeric,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS controle_vgv_codigo_idx ON public.controle_vgv (codigo_obra);

ALTER TABLE public.controle_vgv ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vgv_select ON public.controle_vgv;
DROP POLICY IF EXISTS vgv_insert ON public.controle_vgv;
DROP POLICY IF EXISTS vgv_update ON public.controle_vgv;
DROP POLICY IF EXISTS vgv_delete ON public.controle_vgv;
CREATE POLICY vgv_select ON public.controle_vgv FOR SELECT TO authenticated USING (true);
CREATE POLICY vgv_insert ON public.controle_vgv FOR INSERT TO authenticated
  WITH CHECK (auth.email() IN (SELECT email FROM public.permissao_modulocontrole WHERE pode_editar = true));
CREATE POLICY vgv_update ON public.controle_vgv FOR UPDATE TO authenticated
  USING (auth.email() IN (SELECT email FROM public.permissao_modulocontrole WHERE pode_editar = true));
CREATE POLICY vgv_delete ON public.controle_vgv FOR DELETE TO authenticated
  USING (auth.email() IN (SELECT email FROM public.permissao_modulocontrole WHERE pode_editar = true));

-- Seed (planilha VGV do usuário)
INSERT INTO public.controle_vgv (codigo_obra, ano, nome_obra, cliente, valor_venda) VALUES
  ('NES01', 2025, 'TROCA TELHADO', 'NESTLE GYN', 3150000),
  ('EJA01', 2025, 'IMPERMEABILIZAÇÃO PREDIOS', 'JURONG', 2794000),
  ('PMT01', 2025, 'CONSTRUÇÃO 218 UND HABITACIONAIS', 'PREFEITURA TOLEDO -PR', 22424000),
  ('FS001', 2025, 'WC   e reforma', 'FS ENERGIA', 1023323.19),
  ('EJA06', 2025, 'HH CARPINTEIRO', 'JURONG', 428496.82),
  ('EJA04', 2025, 'CONSTRUÇÃO 02 BANHEIROS', 'JURONG', 2570609.15),
  ('MUNCK', 2025, '4 DIARIA MUCK', 'NESTLE GYN', 17536),
  ('NES03', 2025, 'Reparo tampa concreto', 'Vivian Transpotadora', 3751.83),
  ('NES02', 2025, 'Reparo placa', 'Laticinio fleury', 1714.53),
  ('GB006', 2025, 'Portaria', 'Guabi', 65000),
  ('EDT01', 2025, 'Fundação Tanques', 'Eletrodata ( Coca cola)', 1465000),
  ('NES05', 2025, 'Reforma Refeitório e ADM', 'NESTLE SP', 2249995.3),
  ('FCC01', 2025, 'HH FCC', 'Gerdal', 43000),
  ('EJA05', 2025, 'REPARO VIGAS', 'JURONG', 360142.3),
  ('NES04', 2025, 'CENTRAL CIP', 'NESTLE GYN', 50113.98),
  ('NES06', 2025, 'ADEQUAÇÃO LINHA 2', 'NESTLE GYN', 160000),
  ('NES07', 2025, 'TROCA DE PORTAS E JANELAS', 'NESTLE GYN', 115000),
  ('PER01', 2025, 'PISCINA E CLUBE E FAMILY', 'NATURE', 4300596.44),
  ('PEN01', 2025, 'PENINSULA', NULL, 1108837.73),
  ('TET01', 2025, 'ADEQUAÇÃO REDE PLUVIAL', 'TEUTO', 312000),
  ('NES08', 2025, 'LOCAÇÃO CONTAINER', 'NESTLE GYN', 139000),
  ('NES09', 2025, 'PINTURA CASA DE BOMBAS', 'NESTLE GYN', 170000),
  ('NES10', 2025, 'ROOF REVAMP PHASE 2 - RIO PARDO/SP', 'NESTLE SP', 10900000),
  ('NES11', 2025, 'LOCAÇÃO TENDA 10X10 M', 'NESTLE GYN', 38913.2),
  ('NES12', 2025, 'BASE DAS BOMBAS', 'NESTLE GYN', 24556.24),
  ('STEK1', 2026, 'Piso de Concreto para Galpão Daia', 'STEK AÇO', 330000),
  ('NES14', 2026, 'Construção base do Silo - water Reuse', 'NESTLE GYN', 357000),
  ('NES15', 2026, 'Adequação em Talude', 'NESTLE SP', 68000),
  ('NES16', 2026, 'Troca de telhado banheiro pcd e área de lazer', 'NESTLE GYN', 65000),
  ('NES17', 2026, 'Pavimentação Asfaltica', 'NESTLE MARÍLIA', 1743525.51),
  ('NES18', 2026, 'Locação de Retroescavadeira', 'NESTLE GYN', 8500),
  ('NES19', 2026, 'Piso Projeto Seasoning Capacity Increase', 'NESTLE SP', 900000),
  ('NES20', 2026, 'Execução de Obras Civis, Bases e Adequações Estruturais', 'NESTLE GYN', 810000),
  ('NES21', 2026, 'Execução Civil Telhado Bola 1e 2', 'NESTLE ES', 4700000),
  ('BF01', 2026, 'RETROFIT TELHADO P2O', 'NESTLE NA', 1680000);
