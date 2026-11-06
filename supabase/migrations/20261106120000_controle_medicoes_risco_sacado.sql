-- Marca na nota emitida que ela JÁ APARECEU no site do risco sacado e pode ser
-- antecipada. É um controle manual: quem confere o site marca a bandeirinha na
-- aba "A receber", e a linha sai em verde no PDF exportado.
alter table public.controle_medicoes
    add column if not exists risco_sacado boolean not null default false,
    add column if not exists risco_sacado_em timestamptz;

comment on column public.controle_medicoes.risco_sacado is
    'Nota já disponível no portal de risco sacado para antecipação (marcada à mão).';
comment on column public.controle_medicoes.risco_sacado_em is
    'Quando a bandeirinha de risco sacado foi marcada.';
