-- Card "Valor Recebido Bruto" precisa de TotDesc e TotPrinc da consulta recebido.
-- TotPrinc também é a chave do TREATAS com vendasrecebidas[ValProvisaoCurto_Vrec].
ALTER TABLE public.controle_recebido ADD COLUMN IF NOT EXISTS tot_desc numeric;
ALTER TABLE public.controle_recebido ADD COLUMN IF NOT EXISTS tot_princ numeric;
