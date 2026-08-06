-- Módulo Controle / aba "Fechamento Banco".
-- Espelha a consulta de conciliação bancária do UAU (contas correntes da
-- empresa 4). Guarda apenas os MOVIMENTOS: as linhas de "cheques não
-- compensados" (ChequesNaoCompensados = 1) vêm sem filtro de data na consulta
-- do UAU — são ~11 mil linhas e R$ 38 mi que não são lançamentos do período,
-- então o worker as descarta.

CREATE TABLE IF NOT EXISTS public.banco_extrato (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empresa integer NOT NULL,
  banco integer NOT NULL,
  conta text NOT NULL,
  nome_banco text,
  data date NOT NULL,
  historico text,
  lanct text,
  cheque text,
  credito numeric DEFAULT 0 NOT NULL,
  debito numeric DEFAULT 0 NOT NULL,
  tipo_lanc integer,
  atualizado_em timestamp with time zone DEFAULT now()
);
ALTER TABLE public.banco_extrato ADD CONSTRAINT banco_extrato_pkey PRIMARY KEY (id);
CREATE INDEX IF NOT EXISTS banco_extrato_data_idx ON public.banco_extrato USING btree (data);
CREATE INDEX IF NOT EXISTS banco_extrato_conta_idx ON public.banco_extrato USING btree (banco, conta);

-- Saldo de cada conta na data-base do espelho. O saldo em qualquer data D é
-- saldo_base + soma dos movimentos com data < D — foi assim que reproduzimos,
-- ao centavo, a coluna "Saldo Anterior" do relatório do UAU.
CREATE TABLE IF NOT EXISTS public.banco_saldo_base (
  banco integer NOT NULL,
  conta text NOT NULL,
  nome_banco text,
  data_base date NOT NULL,
  saldo numeric DEFAULT 0 NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now()
);
ALTER TABLE public.banco_saldo_base ADD CONSTRAINT banco_saldo_base_pkey PRIMARY KEY (banco, conta);

ALTER TABLE public.banco_extrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_saldo_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS banco_extrato_select ON public.banco_extrato;
CREATE POLICY banco_extrato_select ON public.banco_extrato FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS banco_saldo_base_select ON public.banco_saldo_base;
CREATE POLICY banco_saldo_base_select ON public.banco_saldo_base FOR SELECT TO authenticated USING (true);
