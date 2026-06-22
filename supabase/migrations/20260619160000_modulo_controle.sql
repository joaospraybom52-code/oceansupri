-- Módulo Controle: previsão de medições a receber por mês.

-- Cidade da obra (origem: UAU; reutiliza a tabela obras do módulo Suprimentos)
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS cidade text;

-- Medições previstas a receber
CREATE TABLE IF NOT EXISTS public.controle_medicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid REFERENCES public.obras(id) ON DELETE CASCADE,
  valor_medicao numeric NOT NULL,
  mes_recebimento date NOT NULL,        -- 1º dia do mês de recebimento
  created_at timestamptz DEFAULT now()
);

-- Permissão de acesso ao módulo Controle (cadastro manual via Supabase)
CREATE TABLE IF NOT EXISTS public.permissao_modulocontrole (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
