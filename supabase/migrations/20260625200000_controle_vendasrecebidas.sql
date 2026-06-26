-- Módulo Controle / aba KPI'S: espelho da tabela "vendasrecebidas" do UAU.
-- Usada no card "Valor Recebido Bruto" via TREATAS: soma
-- ValDescontoImposto_vrec onde ValProvisaoCurto_Vrec ∈ DISTINCT(recebido[TotPrinc]).
-- Filtros do Power Query: Data_VRec > 2024-11-30 e Obra_VRec <> 'DP'.
CREATE TABLE IF NOT EXISTS public.controle_vendasrecebidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_vrec text,
  data_vrec date,
  val_provisao_curto_vrec numeric,
  val_desconto_imposto_vrec numeric,
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS controle_vendasrecebidas_provisao_idx ON public.controle_vendasrecebidas (val_provisao_curto_vrec);
CREATE INDEX IF NOT EXISTS controle_vendasrecebidas_obra_idx ON public.controle_vendasrecebidas (obra_vrec);

ALTER TABLE public.controle_vendasrecebidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS controle_vendasrecebidas_select ON public.controle_vendasrecebidas;
CREATE POLICY controle_vendasrecebidas_select ON public.controle_vendasrecebidas
  FOR SELECT TO authenticated USING (true);
