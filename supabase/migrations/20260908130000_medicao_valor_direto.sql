-- Medição com VALOR DIRETO, sem preencher a planilha item a item.
--
-- Até aqui só o "sinal" permitia lançar um valor sem medir itens. Agora uma
-- medição normal também pode: o usuário informa o período e o valor total, e
-- a planilha de medição fica de fora.
--
-- Regra do valor de uma medição, na ordem:
--   tipo = 'sinal'        -> valor_sinal
--   valor_direto != NULL  -> valor_direto
--   senão                 -> SUM(medicao_itens.valor_medido)
--
-- NULL (e não 0) é o que distingue "lancei direto" de "medi item a item e deu
-- zero" — por isso a coluna é anulável e sem default.
ALTER TABLE public.medicoes
  ADD COLUMN IF NOT EXISTS valor_direto numeric;

COMMENT ON COLUMN public.medicoes.valor_direto IS
  'Valor total lançado à mão, sem medir item a item. NULL = medição pela planilha.';
