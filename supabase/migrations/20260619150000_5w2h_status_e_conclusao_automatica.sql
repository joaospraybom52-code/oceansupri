-- 5W2H passa a ter status de plano de ação e é concluído automaticamente
-- quando a restrição vinculada é removida.

-- 1. Coluna de status do plano de ação
ALTER TABLE public.analises_5w2h
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'em_andamento';

-- 2. Função: ao marcar a restrição como 'removida', conclui os 5W2H ligados a ela
CREATE OR REPLACE FUNCTION public.concluir_5w2h_ao_remover_restricao()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'removida' AND (OLD.status IS DISTINCT FROM 'removida') THEN
    UPDATE public.analises_5w2h SET status = 'concluido' WHERE restricao_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Gatilho na atualização do status da restrição
DROP TRIGGER IF EXISTS trg_concluir_5w2h ON public.restricoes;
CREATE TRIGGER trg_concluir_5w2h
  AFTER UPDATE OF status ON public.restricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.concluir_5w2h_ao_remover_restricao();

-- 4. Backfill: 5W2H já ligados a restrições removidas
UPDATE public.analises_5w2h
  SET status = 'concluido'
  WHERE restricao_id IN (SELECT id FROM public.restricoes WHERE status = 'removida')
    AND status <> 'concluido';
