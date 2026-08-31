-- Empréstimos, juros, tarifas e consórcio — direto do UAU, por STATUS da parcela.
--
-- Por que tabela própria e não uma coluna em controle_pago_insumo_cliente:
--   1. Aquela tabela é escrita pelo robô do NAS (delete + insert). Uma coluna
--      nova ficaria vazia na primeira rodada dele, porque o NAS roda uma cópia
--      antiga do worker — e o NAS não se mexe sem falar com o TI.
--   2. Lá o "a pagar" é StatusParc_Des <> 2, ou seja, status 0 e 1 somados.
--      Aqui o usuário quer SÓ emissão (1) e pago (2), sem o 0 em aberto.
--
-- Alimentada pelo worker sync-emprestimos.ts, que roda na VM Oracle.
CREATE TABLE IF NOT EXISTS public.emprestimos_encargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra text,
  descrinsumo text,
  cliente text,
  mes date,                      -- 1º dia do mês do desembolso
  vlr_emissao numeric NOT NULL DEFAULT 0,   -- StatusParc_Des = 1 (emissão de pagamento)
  vlr_pago numeric NOT NULL DEFAULT 0,      -- StatusParc_Des = 2 (pago)
  qtd integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emprestimos_obra ON public.emprestimos_encargos (obra);
CREATE INDEX IF NOT EXISTS idx_emprestimos_mes ON public.emprestimos_encargos (mes);

ALTER TABLE public.emprestimos_encargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS emprestimos_encargos_select ON public.emprestimos_encargos;
CREATE POLICY emprestimos_encargos_select ON public.emprestimos_encargos
  FOR SELECT TO authenticated USING (true);
