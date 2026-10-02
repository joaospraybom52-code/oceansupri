-- Cadastro de usuários do app (aba restrita ao admin do módulo Obras).
--
-- É o registro "de gente": nome, e-mail, perfil de acesso e situação. Quem manda
-- no acesso continuam sendo as tabelas de permissão (permissoes_obras,
-- permissao_modulocontrole, visualizadores) — esta tabela guarda o perfil
-- escolhido e o histórico de quem criou/desativou.
--
-- Desativar NÃO apaga: o login é bloqueado, as permissões saem e a linha fica
-- com ativo = false, para o histórico do que a pessoa fez continuar rastreável.
create table if not exists usuarios_app (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    email text not null unique,
    perfil text not null,
    ativo boolean not null default true,
    auth_user_id uuid,
    observacoes text,
    criado_por text,
    criado_em timestamptz not null default now(),
    desativado_por text,
    desativado_em timestamptz
);

create index if not exists usuarios_app_email_idx on usuarios_app (email);

alter table usuarios_app enable row level security;

-- Só o admin do módulo Obras enxerga a lista. As escritas passam pelo service
-- role (server actions), que ignora RLS — nenhum usuário escreve direto.
drop policy if exists usuarios_app_select_admin on usuarios_app;
create policy usuarios_app_select_admin on usuarios_app
    for select
    using (exists (
        select 1 from permissoes_obras p
        where p.email = auth.email() and p.papel = 'admin'
    ));
