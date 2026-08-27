-- Views agregadas do Painel de Recebimentos (/controle).
--
-- A página baixava as tabelas inteiras (9.684 linhas em 14 consultas em fila,
-- ~5s no melhor caso) e somava no JavaScript. Em 27/08/2026 a função da página
-- pendurou de vez e o módulo ficou inacessível. Estas views fazem a MESMA soma
-- no Postgres — mesma regra, mesmos números, 1 consulta cada.
--
-- security_invoker = true: a RLS das tabelas de baixo continua valendo, a view
-- não vira porta dos fundos (sem isso, view no PG roda com os direitos do dono).

-- Comprometido por obra/mês. Mesma medida da KPI'S:
--   Despesas  -> vlr_at_pago + vlr_at_pagar
--   DespSaida -> total_receita
-- "pago" é só a parte já paga (Total Pago + Controle Financeiro Saída).
CREATE OR REPLACE VIEW public.vw_controle_comprometido_mes
WITH (security_invoker = true) AS
SELECT
  obra,
  to_char(data_movimento, 'YYYY-MM') AS ym,
  SUM(CASE tipo_controle
        WHEN 'Despesas'  THEN COALESCE(vlr_at_pago, 0) + COALESCE(vlr_at_pagar, 0)
        WHEN 'DespSaida' THEN COALESCE(total_receita, 0)
        ELSE 0 END) AS valor,
  SUM(CASE tipo_controle
        WHEN 'Despesas'  THEN COALESCE(vlr_at_pago, 0)
        WHEN 'DespSaida' THEN COALESCE(total_receita, 0)
        ELSE 0 END) AS pago
FROM public.controle_pago_apagar
WHERE obra IS NOT NULL AND data_movimento IS NOT NULL
GROUP BY 1, 2;

-- Pago por obra/DIA — série "Pago" do Fluxo de Caixa Diário.
CREATE OR REPLACE VIEW public.vw_controle_pago_dia
WITH (security_invoker = true) AS
SELECT obra, data_movimento::date AS data, SUM(v) AS valor
FROM (
  SELECT obra, data_movimento,
         CASE tipo_controle
           WHEN 'Despesas'  THEN COALESCE(vlr_at_pago, 0)
           WHEN 'DespSaida' THEN COALESCE(total_receita, 0)
           ELSE 0 END AS v
  FROM public.controle_pago_apagar
  WHERE obra IS NOT NULL AND data_movimento IS NOT NULL
) t
GROUP BY 1, 2
HAVING SUM(v) <> 0;

-- Recebido por obra/DIA (medida Total Recebido Real).
CREATE OR REPLACE VIEW public.vw_controle_recebido_dia
WITH (security_invoker = true) AS
SELECT obra_rec AS obra, data_rec::date AS data, SUM(COALESCE(tot_conf, 0)) AS valor
FROM public.controle_recebido
WHERE obra_rec IS NOT NULL AND data_rec IS NOT NULL
GROUP BY 1, 2
HAVING SUM(COALESCE(tot_conf, 0)) <> 0;

-- A pagar por obra/DIA (parcelas em débito, pela data de PRORROGAÇÃO).
CREATE OR REPLACE VIEW public.vw_controle_apagar_dia
WITH (security_invoker = true) AS
SELECT obra, data_pagamento::date AS data, SUM(COALESCE(valor, 0)) AS valor
FROM public.contas_a_pagar
WHERE obra IS NOT NULL AND data_pagamento IS NOT NULL
GROUP BY 1, 2
HAVING SUM(COALESCE(valor, 0)) <> 0;

-- A receber por obra/DIA (mesma medida do painel "Próximas Medições").
CREATE OR REPLACE VIEW public.vw_controle_areceber_dia
WITH (security_invoker = true) AS
SELECT obra, data_fim_contrato_ven::date AS data, SUM(COALESCE(valor_prc, 0)) AS valor
FROM public.controle_a_receber
WHERE obra IS NOT NULL AND data_fim_contrato_ven IS NOT NULL
GROUP BY 1, 2
HAVING SUM(COALESCE(valor_prc, 0)) <> 0;

GRANT SELECT ON public.vw_controle_comprometido_mes TO authenticated;
GRANT SELECT ON public.vw_controle_pago_dia         TO authenticated;
GRANT SELECT ON public.vw_controle_recebido_dia     TO authenticated;
GRANT SELECT ON public.vw_controle_apagar_dia       TO authenticated;
GRANT SELECT ON public.vw_controle_areceber_dia     TO authenticated;
