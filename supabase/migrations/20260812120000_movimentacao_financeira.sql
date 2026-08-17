-- Movimentação financeira do UAU (razão de entradas e saídas), fonte da aba
-- DRE Gerencial do módulo Controle.
-- Escopo: empresa 4 e as 15 contas do Fechamento Banco (14 + Santander 13003997-7).
-- Origens materializadas: CONTAS PAGAS, CONTROLE FINANCEIRO, TRANSFERÊNCIA e
-- RECEBIDAS. "Contas a pagar" fica de fora (regra do usuário: custo é só o pago)
-- e "contas a receber" também (a receita vem de RECEBIDAS).
-- Sinal já ajustado na origem: saída negativa, entrada positiva.
CREATE TABLE IF NOT EXISTS public.movimentacao_financeira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa integer,
  obra text,
  desc_obra text,
  descr_comp text,          -- Descr_Comp: a despesa
  nominal text,             -- para o que a despesa foi utilizada
  fornecedor text,
  valor numeric,
  banco integer,
  agencia text,
  conta text,
  emissao date,             -- data da movimentação
  vencimento date,          -- usada nos filtros de período da DRE
  origem text,              -- CONTAS PAGAS | CONTROLE FINANCEIRO | TRANSFERÊNCIA | RECEBIDAS
  natureza text,
  nf text,
  processo text,
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movimentacao_obra_idx ON public.movimentacao_financeira (obra);
CREATE INDEX IF NOT EXISTS movimentacao_venc_idx ON public.movimentacao_financeira (vencimento);
CREATE INDEX IF NOT EXISTS movimentacao_origem_idx ON public.movimentacao_financeira (origem);

ALTER TABLE public.movimentacao_financeira ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS movimentacao_select ON public.movimentacao_financeira;
CREATE POLICY movimentacao_select ON public.movimentacao_financeira
  FOR SELECT TO authenticated USING (true);


-- Classificação do CONTROLE FINANCEIRO da sede (ADMCO/SD005) para a linha de
-- Resultado Financeiro. Mesma ideia da dre_sede_classificacao: o app semeia por
-- palavra-chave e o usuário corrige na tela.
--   rendimento -> entra POSITIVO no resultado financeiro
--   financeiro -> juros, IOF, deságio, tarifas (entra NEGATIVO)
--   emprestimo -> captação; fica fora do resultado (bloco informativo)
--   ignorado   -> estorno, devolução, venda de sucata; fora de tudo
CREATE TABLE IF NOT EXISTS public.dre_gerencial_classificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nominal text NOT NULL UNIQUE,   -- guardado em MAIÚSCULAS
  tipo text NOT NULL CHECK (tipo IN ('rendimento', 'financeiro', 'emprestimo', 'ignorado')),
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.dre_gerencial_classificacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dre_ger_class_select ON public.dre_gerencial_classificacao;
CREATE POLICY dre_ger_class_select ON public.dre_gerencial_classificacao
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS dre_ger_class_insert ON public.dre_gerencial_classificacao;
CREATE POLICY dre_ger_class_insert ON public.dre_gerencial_classificacao
  FOR INSERT TO authenticated
  WITH CHECK (auth.email() IN (SELECT email FROM public.permissao_modulocontrole WHERE pode_editar = true));
DROP POLICY IF EXISTS dre_ger_class_update ON public.dre_gerencial_classificacao;
CREATE POLICY dre_ger_class_update ON public.dre_gerencial_classificacao
  FOR UPDATE TO authenticated
  USING (auth.email() IN (SELECT email FROM public.permissao_modulocontrole WHERE pode_editar = true));
DROP POLICY IF EXISTS dre_ger_class_delete ON public.dre_gerencial_classificacao;
CREATE POLICY dre_ger_class_delete ON public.dre_gerencial_classificacao
  FOR DELETE TO authenticated
  USING (auth.email() IN (SELECT email FROM public.permissao_modulocontrole WHERE pode_editar = true));
