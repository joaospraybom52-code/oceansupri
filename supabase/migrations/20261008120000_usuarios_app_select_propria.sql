-- O usuário precisa enxergar a PRÓPRIA linha de usuarios_app: é por ela que o
-- app descobre o perfil dele (ex.: Planejamento libera a Linha de Base da
-- Curva S). A política de admin continua valendo para a listagem completa.
drop policy if exists usuarios_app_select_propria on usuarios_app;
create policy usuarios_app_select_propria on usuarios_app
    for select
    using (auth.email() = email);
