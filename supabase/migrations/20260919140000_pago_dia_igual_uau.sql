-- Fluxo de Caixa Diário: "Pago" igual ao relatório de contas pagas do UAU.
-- Conferido em 19/09/2026 contra o UAU, dia a dia desde 02/01/2025 (449 dias):
-- as únicas diferenças eram
--   * ISS/Simples pagos nominal à Prefeitura de Anápolis / Ministério da Fazenda,
--     que o robô grava como 'ImpostoRetido' (17/08: R$ 99.007,01);
--   * pagamentos sem obra ou da obra DP (Departamento Pessoal), que o robô
--     descartava e agora grava como 'DespesasSemObra' (R$ 3,03 mi em 130 dias).
-- Os KPIs e os relatórios filtram tipo_controle explicitamente e não mudam.
create or replace view vw_controle_pago_dia
with (security_invoker = true) as
select obra, data_movimento as data, sum(coalesce(vlr_at_pago, 0)) as valor
from controle_pago_apagar
where obra is not null
  and data_movimento is not null
  and tipo_controle in ('Despesas', 'ImpostoRetido', 'DespesasSemObra')
group by obra, data_movimento
having sum(coalesce(vlr_at_pago, 0)) <> 0;
