-- Desconto do sinal nas medições.
--
-- Quando a obra tem uma medição de SINAL (tipo='sinal', valor_sinal), o sinal é
-- um adiantamento e vai sendo devolvido nas medições seguintes. Cada medição
-- passa a ter o seu próprio percentual de desconto, digitado pelo usuário.
--
-- Base do cálculo: percentual sobre o VALOR DA MEDIÇÃO do período
-- (amortização proporcional ao que foi medido).
--
-- O desconto nunca passa do saldo do sinal ainda não amortizado — a trava é
-- feita na tela, com o saldo à vista.
ALTER TABLE public.medicoes
  ADD COLUMN IF NOT EXISTS desconto_sinal_percentual numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.medicoes.desconto_sinal_percentual IS
  'Percentual de amortização do sinal nesta medição, aplicado sobre o valor medido no período. 0 = sem desconto.';
