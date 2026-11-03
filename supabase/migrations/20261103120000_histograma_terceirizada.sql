-- Histograma: mão de obra TERCEIRIZADA, no mesmo padrão de MOI/MOD/Equipamentos.
-- O efetivo semanal alimenta o gráfico e o PTW (efetivo x 8 h x dias úteis).
alter table public.histograma_semanas
    add column if not exists terc_prev numeric,
    add column if not exists terc_real numeric;

comment on column public.histograma_semanas.terc_prev is 'Efetivo previsto de mão de obra terceirizada na semana';
comment on column public.histograma_semanas.terc_real is 'Efetivo realizado de mão de obra terceirizada na semana';
