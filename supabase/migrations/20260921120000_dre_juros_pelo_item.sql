-- DRE Gerencial: a categoria financeira passa a ser decidida pelo ITEM primeiro.
-- O UAU marca o mesmo pagamento de um jeito no item e de outro no insumo — ex.:
-- item "IN5494 - JUROS" com insumo "TARIFAS BANCARIAS" ou "PAGAMENTO DE
-- EMPRESTIMOS". Regra da diretoria (21/09/2026): se o ITEM diz juros, é juros,
-- não importa o insumo. Só quando o item não diz nada financeiro o insumo decide.
-- 2026: juros vai de R$ 65.826,50 (pelo insumo) para R$ 461.848,87 (pelo item).
create or replace view vw_dre_pago_mes
with (security_invoker = true) as
with base as (
    select
        date_trunc('month', data_movimento)::date as mes,
        upper(translate(coalesce(item, ''),
              'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
              'AAAAAEEEEIIIIOOOOOUUUUCAAAAAEEEEIIIIOOOOOUUUUC')) as item,
        upper(translate(coalesce(descrinsumo, ''),
              'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
              'AAAAAEEEEIIIIOOOOOUUUUCAAAAAEEEEIIIIOOOOOUUUUC')) as insumo,
        upper(btrim(coalesce(obra, ''))) as obra,
        coalesce(vlr_at_pago, 0) as valor
    from controle_pago_insumo_cliente
    where data_movimento is not null
)
select
    mes,
    case
        -- 1º o item
        when item like '%JUROS%'       then 'juros'
        when item like '%EMPREST%'     then 'emprestimo'
        when item like '%TARIFA%'      then 'tarifa'
        when item like '%CONSORCIO%'   then 'consorcio'
        -- 2º o insumo, só se o item não disse nada financeiro
        when insumo like '%EMPREST%'   then 'emprestimo'
        when insumo like '%JUROS%'     then 'juros'
        when insumo like '%TARIFA%'    then 'tarifa'
        when insumo like '%CONSORCIO%' then 'consorcio'
        when obra = any (array['SD003','SD004','SD005','ADMCO','DRT02','DRT03','DRT04']) then 'fixo'
        else 'variavel'
    end as categoria,
    sum(valor) as valor
from base
group by 1, 2
having sum(valor) <> 0;
