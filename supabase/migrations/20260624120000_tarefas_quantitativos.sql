-- Quantitativos de produção por tarefa na programação semanal:
-- unidade de medida, total da semana e quanto será feito por dia (seg→dom).
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS unidade text;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_total numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_seg numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_ter numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_qua numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_qui numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_sex numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_sab numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_dom numeric;
