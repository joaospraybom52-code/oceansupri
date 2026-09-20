-- Dados que faltavam para a DRE Gerencial (módulo Controle).

-- 1) Número da venda no recebido e nas vendas recebidas: casa o recebimento com
--    a venda (e com o imposto retido dela) por contrato, e não por valor.
alter table controle_recebido        add column if not exists num_vend integer;
alter table controle_vendasrecebidas add column if not exists num_vend integer;
alter table controle_vendasrecebidas add column if not exists valor_tot numeric(14,2);
create index if not exists controle_recebido_venda_idx        on controle_recebido (obra_rec, num_vend);
create index if not exists controle_vendasrecebidas_venda_idx on controle_vendasrecebidas (obra_vrec, num_vend);

-- 2) Pagamentos ao fisco com ITEM e FAVORECIDO — as outras tabelas descartam
--    esses lançamentos, e sem eles não dá para separar o Simples federal
--    (MINISTERIO DA FAZ./ SEC. DA REC. FEDERAL) do ISSQN da prefeitura.
create table if not exists controle_impostos_pagos (
    id uuid primary key default gen_random_uuid(),
    obra text,
    data_movimento date,            -- sempre no dia 1º: grão mensal
    item text,                      -- ex.: 'IN0001 - IMPOSTOS SIMPLES'
    cliente text,                   -- favorecido do pagamento
    valor numeric(14,2) not null default 0,
    atualizado_em timestamptz not null default now()
);
create index if not exists controle_impostos_pagos_mes_idx on controle_impostos_pagos (data_movimento);

alter table controle_impostos_pagos enable row level security;
drop policy if exists controle_impostos_pagos_select on controle_impostos_pagos;
create policy controle_impostos_pagos_select on controle_impostos_pagos
    for select to authenticated using (true);
