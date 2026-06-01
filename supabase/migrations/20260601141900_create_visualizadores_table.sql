CREATE TABLE public.visualizadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT,
    auth_user_id UUID REFERENCES auth.users(id),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.visualizadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.visualizadores FOR SELECT USING (true);
