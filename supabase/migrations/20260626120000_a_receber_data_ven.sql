-- Relação do filtro de data: A_receber passa a ser filtrada por data_ven
-- (data da venda, Vendas.Data_Ven) em vez de data_prc.
ALTER TABLE public.controle_a_receber ADD COLUMN IF NOT EXISTS data_ven date;
CREATE INDEX IF NOT EXISTS controle_a_receber_dataven_idx ON public.controle_a_receber (data_ven);
