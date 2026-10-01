-- Campo livre de observações no cadastro de venda (VGV).
-- Pedido do usuário em 01/10/2026: anotar contexto da obra/venda (escopo,
-- condição de pagamento, pendência com o cliente) junto do cadastro.
alter table controle_vgv add column if not exists observacoes text;
