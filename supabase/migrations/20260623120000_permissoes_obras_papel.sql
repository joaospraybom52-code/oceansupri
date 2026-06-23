-- Papel de acesso ao módulo Obras: viewer (só visualiza), editor (medições e
-- programações, sem criar/editar obra) ou admin (tudo).
ALTER TABLE public.permissoes_obras
  ADD COLUMN IF NOT EXISTS papel text NOT NULL DEFAULT 'viewer';
