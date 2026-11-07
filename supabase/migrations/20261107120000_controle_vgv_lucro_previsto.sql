-- Lucro previsto do contrato, informado à mão no Cadastro de venda (em R$).
-- Aparece no card MEDIÇÃO + FATURAMENTO (aba KPI'S e Relatório de Custo) logo
-- abaixo do VGV, com a margem % calculada sobre o valor de venda.
alter table public.controle_vgv
    add column if not exists lucro_previsto numeric;

comment on column public.controle_vgv.lucro_previsto is
    'Lucro previsto do contrato em R$ (digitado no Cadastro de venda).';
