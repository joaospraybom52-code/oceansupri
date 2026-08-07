-- Módulo Controle: espelho das CONTAS A PAGAR em aberto do UAU (Dados_Proc + Parc_Proc).
-- Alimenta o "A Pagar" do Fluxo de Caixa Diário e o relatório "Fluxo de Caixa"
-- da aba Fechamento Banco.
-- Regra do usuário: só entram parcelas com Conf_Proc = 'DVQ' (liberadas p/ pagamento);
-- o valor é ValPagar_proc = (ValorParc + Acrescimo) - Desconto e a data é DtPagParc_Proc.
-- Atualizada pelo worker sync-a-pagar.ts (delete + insert).
CREATE TABLE IF NOT EXISTS public.contas_a_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa integer,
  obra text,                 -- Obra_Proc
  num_proc integer,          -- Num_Proc
  num_parc integer,          -- NumParc_Proc
  banco integer,             -- banContParc_proc
  conta text,                -- Conta_Proc
  fornecedor text,           -- Pessoas.nome_pes
  obs_pag text,              -- ObsPag_Proc
  data_pagamento date,       -- DtPagParc_Proc (vencimento//data prevista)
  valor numeric,             -- ValPagar_proc
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contas_a_pagar_obra_idx ON public.contas_a_pagar (obra);
CREATE INDEX IF NOT EXISTS contas_a_pagar_data_idx ON public.contas_a_pagar (data_pagamento);

-- Leitura liberada para autenticados (escrita só via service role do worker).
ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contas_a_pagar_select ON public.contas_a_pagar;
CREATE POLICY contas_a_pagar_select ON public.contas_a_pagar
  FOR SELECT TO authenticated USING (true);
