-- Realizado por dia da tarefa (espelha o previsto qtd_seg..qtd_dom), para a
-- matriz Previsto × Realizado da programação semanal.
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_real_seg numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_real_ter numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_real_qua numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_real_qui numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_real_sex numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_real_sab numeric;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS qtd_real_dom numeric;
