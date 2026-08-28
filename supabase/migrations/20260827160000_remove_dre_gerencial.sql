-- Remove a aba DRE Gerencial (pedido do usuário em 27/08/2026 — será refeita
-- de outra forma). Some a tela, o worker sync-movimentacao e as três tabelas
-- que só ela usava.
--
-- Conferido antes de excluir: nenhuma chave estrangeira aponta para estas
-- tabelas e nenhuma view depende delas. As outras abas do Controle (Painel de
-- Recebimentos, KPI'S, DRE Sede, Fechamento Banco, Cadastro de Venda) não
-- tocam em nenhuma das três.
--
-- Peso liberado: movimentacao_financeira 13 MB / 21.933 linhas,
-- dre_gerencial_linha 64 kB, dre_gerencial_classificacao 48 kB.

DROP TABLE IF EXISTS public.dre_gerencial_linha;
DROP TABLE IF EXISTS public.dre_gerencial_classificacao;
DROP TABLE IF EXISTS public.movimentacao_financeira;
