-- Aba Empréstimos e Encargos: o item do processo, para classificar pelo item
-- primeiro (regra da diretoria, 21/09/2026).
alter table emprestimos_encargos add column if not exists item text;
