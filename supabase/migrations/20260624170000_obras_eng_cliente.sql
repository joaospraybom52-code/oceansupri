-- Nome do cliente da obra (ex: Nestlé), exibido no cabeçalho do relatório.
ALTER TABLE public.obras_eng ADD COLUMN IF NOT EXISTS cliente text;
