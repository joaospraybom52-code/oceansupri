-- Permite excluir uma obra (e seu orçamento) sem violar FKs de links opcionais.
-- tarefa.item_orcamento_id e restricao.tarefa_id são vínculos opcionais: ao apagar
-- o alvo, o vínculo deve ser zerado (SET NULL), não bloquear/apagar o registro.
ALTER TABLE public.tarefas DROP CONSTRAINT IF EXISTS tarefas_item_orcamento_id_fkey;
ALTER TABLE public.tarefas ADD CONSTRAINT tarefas_item_orcamento_id_fkey
  FOREIGN KEY (item_orcamento_id) REFERENCES public.itens_orcamento(id) ON DELETE SET NULL;

ALTER TABLE public.restricoes DROP CONSTRAINT IF EXISTS restricoes_tarefa_id_fkey;
ALTER TABLE public.restricoes ADD CONSTRAINT restricoes_tarefa_id_fkey
  FOREIGN KEY (tarefa_id) REFERENCES public.tarefas(id) ON DELETE SET NULL;
