-- Fechamento Banco: espelho do extrato DETALHADO do UAU.
-- Serve só para enriquecer a conciliação: preenche o histórico quando o
-- lançamento vem sem descrição e traz a obra do lançamento. O cruzamento com
-- banco_extrato é por conta + data + crédito + débito.
CREATE TABLE IF NOT EXISTS public.banco_extrato_detalhe (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa integer,
  banco integer NOT NULL,
  conta text NOT NULL,
  data date NOT NULL,
  hist text,
  numdoc text,
  credito numeric DEFAULT 0 NOT NULL,
  debito numeric DEFAULT 0 NOT NULL,
  obra text,
  origem integer,
  atualizado_em timestamp with time zone DEFAULT now()
);
ALTER TABLE public.banco_extrato_detalhe ADD CONSTRAINT banco_extrato_detalhe_pkey PRIMARY KEY (id);
-- Índice na chave de cruzamento usada pela tela
CREATE INDEX IF NOT EXISTS banco_extrato_detalhe_match_idx
  ON public.banco_extrato_detalhe USING btree (banco, conta, data);

ALTER TABLE public.banco_extrato_detalhe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS banco_extrato_detalhe_select ON public.banco_extrato_detalhe;
CREATE POLICY banco_extrato_detalhe_select ON public.banco_extrato_detalhe
  FOR SELECT TO authenticated USING (true);
