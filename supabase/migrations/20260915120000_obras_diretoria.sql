-- Aba "Obras diretoria" (ES001 - Energia Solar): vendas do UAU + de-para
-- item pai -> cliente. Tudo visível apenas para quem é admin em permissoes_obras.

create table if not exists vendas_uau (
    id uuid primary key default gen_random_uuid(),
    obra_ven text not null,
    num_ven integer not null,
    origem text not null,               -- 'V' = Vendas (em aberto) | 'R' = VendasRecebidas
    status_ven integer,                 -- 0 = a receber | 3 = recebida
    cliente text,
    valor_tot numeric(14,2),
    data_ven date,
    hist_lanc text,
    atualizado_em timestamptz not null default now(),
    unique (obra_ven, origem, num_ven)
);
create index if not exists vendas_uau_obra_idx on vendas_uau (obra_ven);

create table if not exists diretoria_clientes (
    obra_plt text not null,
    item_plt text not null,             -- item pai do plano (serv_plt = '-1')
    cliente text not null,              -- nome do cliente no UAU (Pessoas.nome_pes)
    primary key (obra_plt, item_plt)
);

-- De-para confirmado pela diretoria: um cliente pode ter várias usinas.
insert into diretoria_clientes (obra_plt, item_plt, cliente) values
    ('ES001', '08', 'G A ALIMENTOS LTDA - GERSON'),
    ('ES001', '09', 'G A ALIMENTOS LTDA - GERSON'),
    ('ES001', '10', 'G A ALIMENTOS LTDA - GERSON'),
    ('ES001', '11', 'PADDOCK PNEUS TRUCK CENTER LTDA - DAGMAR'),
    ('ES001', '12', 'PADDOCK PNEUS TRUCK CENTER LTDA - DAGMAR'),
    ('ES001', '13', 'PEDRO ARCHANJO FERREIRA NETO'),
    ('ES001', '14', 'CARLOS ANTONIO MOREIRA JUNIOR')
on conflict (obra_plt, item_plt) do update set cliente = excluded.cliente;

alter table vendas_uau enable row level security;
alter table diretoria_clientes enable row level security;

create or replace function e_admin_obras() returns boolean
language sql stable security invoker as $$
    select exists (
        select 1 from permissoes_obras p
        where lower(p.email) = lower(auth.email()) and p.papel = 'admin'
    )
$$;

drop policy if exists vendas_uau_select on vendas_uau;
create policy vendas_uau_select on vendas_uau for select to authenticated using (e_admin_obras());

drop policy if exists diretoria_clientes_select on diretoria_clientes;
create policy diretoria_clientes_select on diretoria_clientes for select to authenticated using (e_admin_obras());

-- As linhas das obras da diretoria ficam legíveis só para o admin; o resto das
-- obras continua liberado para todo usuário logado (aba Acompanhamento de Custo).
drop policy if exists custo_uau_select on custo_uau;
create policy custo_uau_select on custo_uau for select to authenticated
    using (obra_plt <> all (array['ES001']) or e_admin_obras());

drop policy if exists custo_materiais_select on custo_materiais;
create policy custo_materiais_select on custo_materiais for select to authenticated
    using (obra_plt <> all (array['ES001']) or e_admin_obras());
