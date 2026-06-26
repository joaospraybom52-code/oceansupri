-- Painel "Próximas Medições" (medida HTML_Recebivel) precisa de mais 3 colunas
-- da A_receber: valor da parcela, data prevista de recebimento e descrição/nota.
ALTER TABLE public.controle_a_receber ADD COLUMN IF NOT EXISTS valor_prc numeric;
ALTER TABLE public.controle_a_receber ADD COLUMN IF NOT EXISTS data_fim_contrato_ven date;
ALTER TABLE public.controle_a_receber ADD COLUMN IF NOT EXISTS hist_lanc_ven text;
