-- Curva S / Linha de Base por obra. O usuário cadastra LB1 e LB2 (linha de base
-- do MS Project) e preenche o Real semana a semana. A Tendência é calculada no app.
CREATE TABLE IF NOT EXISTS public.curva_s_semanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid REFERENCES public.obras_eng(id) ON DELETE CASCADE,
  semana_ref date NOT NULL,            -- data de referência da semana
  ordem int DEFAULT 0,
  lb1_pct numeric,                     -- % acumulado Linha de Base 1
  lb2_pct numeric,                     -- % acumulado Linha de Base 2
  real_pct numeric,                    -- % acumulado realizado
  created_at timestamptz DEFAULT now(),
  UNIQUE (obra_id, semana_ref)
);
ALTER TABLE public.curva_s_semanas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total Curva S" ON public.curva_s_semanas AS PERMISSIVE FOR ALL TO authenticated USING (true);
