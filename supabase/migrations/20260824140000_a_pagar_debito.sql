-- Troca da régua do "a pagar": a fonte deixa de ser a medida DVQ
-- (StatusParc_proc = 0 + Conf_Proc = 'DVQ') e passa a ser as duas medidas de
-- DÉBITO do usuário — parcelas já EMITIDAS aguardando débito:
--   StatusParc_proc = 1 AND TipoChq_Proc IN ('Débito Eletrônico', 'Débito C/C')
-- A data usada é a PRORROGAÇÃO (DtPagParc_Proc) e o nominal é ChqNome_Proc.
ALTER TABLE public.contas_a_pagar ADD COLUMN IF NOT EXISTS total_parcelas integer;
ALTER TABLE public.contas_a_pagar ADD COLUMN IF NOT EXISTS tipo_pagamento text;
ALTER TABLE public.contas_a_pagar ADD COLUMN IF NOT EXISTS vencimento date;

COMMENT ON COLUMN public.contas_a_pagar.data_pagamento IS 'DtPagParc_Proc — data de PRORROGAÇÃO (a que vale no fluxo de caixa)';
COMMENT ON COLUMN public.contas_a_pagar.vencimento IS 'DtVencParc_Proc — vencimento original, só para referência';
COMMENT ON COLUMN public.contas_a_pagar.fornecedor IS 'ChqNome_Proc — o nominal do pagamento';
