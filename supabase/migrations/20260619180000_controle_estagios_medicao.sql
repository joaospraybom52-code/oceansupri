-- Controle: ciclo da medição em 3 estágios.
--  tipo = 'previsao' (previsão futura) | 'emitida' (nota fiscal emitida)
--  recebimento confirmado quando percentual_recebido/mes_recebimento_real preenchidos
ALTER TABLE public.controle_medicoes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'previsao',
  ADD COLUMN IF NOT EXISTS nota_fiscal text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS percentual_recebido numeric,
  ADD COLUMN IF NOT EXISTS mes_recebimento_real date;

-- Registros já existentes representam medições com nota emitida
UPDATE public.controle_medicoes SET tipo = 'emitida' WHERE tipo = 'previsao';
