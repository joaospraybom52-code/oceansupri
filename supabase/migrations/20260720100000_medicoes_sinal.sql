-- Módulo Obras-Eng / Medições: medição do tipo "Sinal" (entrada/adiantamento
-- sem medição física de itens). tipo='sinal' guarda o valor em valor_sinal;
-- medições normais seguem com tipo='medicao' e itens em medicao_itens.
ALTER TABLE public.medicoes ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'medicao';
ALTER TABLE public.medicoes ADD COLUMN IF NOT EXISTS valor_sinal numeric;
