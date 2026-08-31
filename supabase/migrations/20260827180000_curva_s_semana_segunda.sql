-- Curva S passa a ser cadastrada por SEMANA (segunda a domingo), casando com a
-- programação semanal — que sempre começa na segunda em todas as obras.
--
-- Antes: a curva era um ponto solto numa data. A maioria das obras (BF01,
-- NES10, NES22, NES23) gravava no DOMINGO, enquanto a programação começa na
-- SEGUNDA. Um dia de diferença fazia o relatório não achar o ponto e deixar
-- % Previsto / % Real / % Desvio / Status em branco.
--
-- Regra da migração (definida pelo usuário): a linha que hoje está no domingo
-- 23/08 vira a semana que COMEÇA em 24/08 — ou seja, domingo + 1 dia. Só as
-- linhas de domingo se movem:
--   * as que já estão na segunda (NES17, NES19, NES20, NES21) ficam como estão;
--   * os marcos de início/fim da linha de base (quinta, sexta, sábado — os
--     pontos de 0% e 100%) também ficam, para não mexer em Início LB /
--     Término LB nem no cálculo de desvio de prazo.
--
-- Os PERCENTUAIS não são tocados: muda só a data da linha, o lb1_pct e o
-- real_pct continuam onde estavam.
--
-- Conferido antes de rodar: nenhum domingo colide com uma segunda já existente
-- (a UNIQUE (obra_id, semana_ref) não é violada).
--
-- O fim da semana não é gravado: é sempre semana_ref + 6 dias (segunda a
-- domingo), calculado na tela. Assim não há como as duas pontas divergirem.
UPDATE public.curva_s_semanas
SET semana_ref = semana_ref + 1
WHERE EXTRACT(DOW FROM semana_ref) = 0;   -- 0 = domingo

COMMENT ON COLUMN public.curva_s_semanas.semana_ref IS
  'Início da semana (segunda-feira). A semana vai daqui até +6 dias (domingo) e casa com a programação semanal.';
