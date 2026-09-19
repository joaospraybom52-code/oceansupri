-- Fluxo de Caixa Diário (Controle): "Pago" passa a ser só CONTAS PAGAS, igual ao
-- relatório de contas pagas do UAU (ex.: 04/09/2026 = R$ 282.108,17). Antes somava
-- também o controle financeiro de saída (DespSaida: aplicações/empréstimos), e o
-- dia 02/09 aparecia com R$ 800 mil a mais por duas aplicações de R$ 400 mil.
-- Os KPIs continuam tratando o controle financeiro à parte (tabela, não esta view).
create or replace view vw_controle_pago_dia
with (security_invoker = true) as
select obra, data_movimento as data, sum(coalesce(vlr_at_pago, 0)) as valor
from controle_pago_apagar
where obra is not null
  and data_movimento is not null
  and tipo_controle = 'Despesas'
group by obra, data_movimento
having sum(coalesce(vlr_at_pago, 0)) <> 0;
