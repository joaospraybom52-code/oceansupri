-- Uma obra por código. Até 10/2026 havia 9 linhas repetidas (NES21 aparecia 4
-- vezes na lista do Suprimentos): os robôs faziam "procura; se não achar, cria"
-- e duplicavam quando a consulta falhava por rede ou quando o robô do NAS e o da
-- VM criavam a mesma obra ao mesmo tempo.
--
-- As repetidas foram mescladas na linha com histórico (pedidos e medições
-- repontados) antes de criar o índice.
update obras set codigo = upper(trim(codigo)) where codigo <> upper(trim(codigo));
create unique index if not exists obras_codigo_unico on obras (upper(trim(codigo)));
