-- A DRE Gerencial trazia as ~14 mil linhas do pago para somar na tela. Com a
-- paginação de 1000 em 1000 e SEM ordem estável, cada carregamento pegava um
-- conjunto diferente de linhas e os valores mudavam a cada F5 (20/09/2026).
-- Aqui a soma sai pronta do banco, já classificada, em algumas dezenas de linhas.
-- As regras espelham src/lib/utils/insumos-financeiros.ts e OBRAS_SEDE.
create or replace view vw_dre_pago_mes
with (security_invoker = true) as
with base as (
    select
        date_trunc('month', data_movimento)::date as mes,
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
