-- Dados textuais variáveis do relatório semanal, salvos por semana:
-- principais ocorrências, monitoramento pluviométrico e análise de desvios.
-- As fotos NÃO são salvas (anexadas só na hora de gerar o PDF).
CREATE TABLE IF NOT EXISTS public.relatorio_semanal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid REFERENCES public.obras_eng(id) ON DELETE CASCADE,
  semana_ref date NOT NULL,
  ocorrencias jsonb DEFAULT '[]'::jsonb,      -- lista de strings
  pluviometrico jsonb DEFAULT '{}'::jsonb,    -- { seg:{manha,tarde,noite}, ... }
  desvios jsonb DEFAULT '[]'::jsonb,          -- lista de { motivo, qtd }
  observacoes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (obra_id, semana_ref)
);
ALTER TABLE public.relatorio_semanal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total Relatorio Semanal" ON public.relatorio_semanal AS PERMISSIVE FOR ALL TO authenticated USING (true);
