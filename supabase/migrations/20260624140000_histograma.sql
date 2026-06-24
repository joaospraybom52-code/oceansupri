-- Histograma de recursos por semana: Mão de Obra Indireta (MOI), Mão de Obra
-- Direta (MOD) e Equipamentos, com valores previsto x real.
CREATE TABLE IF NOT EXISTS public.histograma_semanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid REFERENCES public.obras_eng(id) ON DELETE CASCADE,
  semana_ref date NOT NULL,
  ordem int DEFAULT 0,
  moi_prev numeric,
  moi_real numeric,
  mod_prev numeric,
  mod_real numeric,
  equip_prev numeric,
  equip_real numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE (obra_id, semana_ref)
);
ALTER TABLE public.histograma_semanas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total Histograma" ON public.histograma_semanas AS PERMISSIVE FOR ALL TO authenticated USING (true);
