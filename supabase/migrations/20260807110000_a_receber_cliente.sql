-- Nome do cliente (contraparte do recebimento) nas contas a receber.
-- Origem: Vendas.Cliente_Ven -> Pessoas.nome_pes no UAU.
-- Usado no relatório "Fluxo de Caixa" (linhas do tipo Receber), onde ocupa o
-- mesmo lugar que o fornecedor ocupa nas linhas a pagar.
ALTER TABLE public.controle_a_receber ADD COLUMN IF NOT EXISTS cliente text;
