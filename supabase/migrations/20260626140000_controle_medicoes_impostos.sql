-- Notas de serviço: % de ISS e INSS por medição (informados na nota emitida).
ALTER TABLE public.controle_medicoes ADD COLUMN IF NOT EXISTS iss_percentual numeric;
ALTER TABLE public.controle_medicoes ADD COLUMN IF NOT EXISTS inss_percentual numeric;
