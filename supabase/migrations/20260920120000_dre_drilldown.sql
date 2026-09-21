-- Detalhe por linha da DRE Gerencial: cliente no recebido e item no pago.
alter table controle_recebido            add column if not exists cliente text;
alter table controle_pago_insumo_cliente add column if not exists item text;
create index if not exists controle_pago_ic_item_idx on controle_pago_insumo_cliente (data_movimento, obra);
