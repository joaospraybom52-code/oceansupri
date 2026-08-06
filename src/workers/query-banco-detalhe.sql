SELECT		ExtratoConc.Data,
			UPPER(ExtratoConc.Hist) [Hist],
			ExtratoConc.NumDoc,
			ExtratoConc.Credito,
			ExtratoConc.Debito,
			ExtratoConc.Empresa_Es,
			ExtratoConc.Obra,
			ExtratoConc.Origem,
			ExtratoConc.TipoDet,
			ExtratoConc.Banco,
			ExtratoConc.Conta
FROM
(
			/* Saídas dos controles financeiros: 1 para SAIDA 0 para ENTRADA */
			SELECT		Data_Es [Data],
						Desc_CGer [Hist],
						CAST(NumDoc_Es AS VARCHAR) [NumDoc],
						CASE EntSai_Es WHEN 0 THEN Valor_Es ELSE 0 END [Credito],
						CASE EntSai_Es WHEN 1 THEN Valor_Es ELSE 0 END [Debito],
						Empresa_Es,
						Obra_Es [Obra],
						0 [Origem],
						0 [TipoDet],
						Banco_Es [Banco],
						Conta_Es [Conta]
			FROM		EntSaiEmpAplic
			INNER JOIN CategoriasDeTipoDeMovimentacao
						ON natureza_Es = Codigo_CGer
			INNER JOIN fn_ListEmpBancoConta ('4|1/10744-X,4|1/10744-G,4|1/10745-G,4|1/10745-X,4|104/580256669-4,4|341/99302-7,4|341/99458-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-G,4|756/127859-2',',')
						ON Empresa = Empresa_Es
						AND Banco = Banco_Es
						AND Conta = Conta_Es
			WHERE		Data_Es BETWEEN '01/01/2026' AND '10/11/2050'

			UNION ALL

			/* Entradas - Transferências Bancárias */
			SELECT		Data_Tb [Data],
						'Transf. bancária de ' + CAST(BcoDeb_Tb AS VARCHAR) + ' - ' + ContaDeb_Tb + ' p/ ' + CAST(BcoCred_Tb AS VARCHAR) + ' - ' + ContaCred_Tb [Hist],
						CAST(NumDoc_Tb AS VARCHAR) [NumDoc],
						Valor_Tb [Credito],
						0 [Debito],
						EmpresaCred_tb,
						NULL [Obra],
						1 [Origem],
						0 [TipoDet],
						BcoCred_Tb [Banco],
						ContaCred_Tb [Conta]
			FROM		TransfBco
			INNER JOIN fn_ListEmpBancoConta ('4|1/10744-X,4|1/10744-G,4|1/10745-G,4|1/10745-X,4|104/580256669-4,4|341/99302-7,4|341/99458-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-G,4|756/127859-2',',')
						ON Empresa = EmpresaCred_tb
						AND Banco = BcoCred_Tb
						AND Conta = ContaCred_Tb
			WHERE		Data_Tb BETWEEN '01/01/2026' AND '10/11/2050'

			UNION ALL

			/* Saídas - Transferências Bancárias */
			SELECT		Data_Tb [Data],
						'Transf. bancária de ' + CAST(BcoDeb_Tb AS VARCHAR) + ' - ' + ContaDeb_Tb + ' p/ ' + CAST(BcoCred_Tb AS VARCHAR) + ' - ' + ContaCred_Tb [Hist],
						CAST(NumDoc_Tb AS VARCHAR) [NumDoc],
						0 [Credito],
						Valor_Tb [Debito],
						Empresa_Tb,
						NULL [Obra],
						2 [Origem],
						0 [TipoDet],
						BcoDeb_Tb [Banco],
						ContaDeb_Tb [Conta]
			FROM		TransfBco
			INNER JOIN fn_ListEmpBancoConta ('4|1/10744-X,4|1/10744-G,4|1/10745-G,4|1/10745-X,4|104/580256669-4,4|341/99302-7,4|341/99458-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-G,4|756/127859-2',',')
						ON Empresa = Empresa_Tb
						AND Banco = BcoDeb_Tb
						AND Conta = ContaDeb_Tb
			WHERE		Data_Tb BETWEEN '01/01/2026' AND '10/11/2050'

			UNION ALL

			/* Processos de Pagamento: cheques, débitos C/C, débitos eletrônicos e borderôs */
			SELECT		DataEmissao_Pag [Data],
						Nominal_Chq [Hist],
						CAST(Num_Chq AS VARCHAR) [NumDoc],
						0 [Credito],
						SUM(ValorProc_Pag) [Debito],
						Empresa_Pag,
						ObraProc_Pag [Obra],
						3 [Origem],
						0 [TipoDet],
						NumBank_Chq [Banco],
						Conta_Chq [Conta]
			FROM		CheqEmissao
			INNER JOIN Extrato
				ON Empresa_Chq = Empresa_Doc
				AND Conta_Chq = Conta_Doc
				AND Num_Chq = Numero_Doc
				AND NumBank_Chq = Banco_Doc
			INNER JOIN fn_ListEmpBancoConta ('4|1/10744-X,4|1/10744-G,4|1/10745-G,4|1/10745-X,4|104/580256669-4,4|341/99302-7,4|341/99458-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-G,4|756/127859-2',',')
				ON Empresa = Empresa_chq
				AND Banco = NumBank_Chq
				AND Conta = Conta_Chq
			LEFT JOIN ContasPagas
				ON Empresa_Pag = Empresa_Chq
				AND BancoProc_Pag = NumBank_Chq
				AND Conta_Pag = Conta_Chq
				AND NumChq_Pag = Num_Chq
			WHERE		Status_Doc = 2
						AND DataEmissao_Pag BETWEEN '01/01/2026' AND '10/11/2050'
			GROUP BY	DataEmissao_Pag, Nominal_Chq, Num_Chq, Empresa_Pag, ObraProc_Pag, NumBank_Chq, Conta_Chq

			UNION ALL

			/* Depósitos */
			SELECT		Data_Dep [Data],
						'Depósitos - ' + CASE WHEN Tipo_Rpg = 'E' AND PATINDEX('%{AR}%', DescTit_Rpg) >= BancoDep_Rpg THEN 'Eletrônico' ELSE 'Manual' END [Hist],
						CAST(Numero_Doc AS VARCHAR) [NumDoc],
						SUM(PercentValor_Rpd) [Credito],
						0 [Debito],
						Empresa_Rpd,
						Obra_Rpd [Obra],
						4 [Origem],
						0 [TipoDet],
						BancoDep_Rpg [Banco],
						ContaDep_Rpg [Conta]
			FROM		RecebePgto
			INNER JOIN Extrato
				ON BancoDep_Rpg = Banco_Doc
				AND Empresa_Rpg = Empresa_Doc
				AND ContaDep_Rpg = Conta_Doc
				AND NumDep_Rpg = Numero_Doc
			INNER JOIN RecebePgtoDiv
				ON Empresa_Rpg = Empresa_Rpd
				AND NumReceb_Rpg = NumReceb_Rpd
				AND Tipo_Rpg = TipoRpg_Rpd
				AND NumCont_Rpg = NumCont_Rpd
			INNER JOIN fn_ListEmpBancoConta ('4|1/10744-X,4|1/10744-G,4|1/10745-G,4|1/10745-X,4|104/580256669-4,4|341/99302-7,4|341/99458-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-G,4|756/127859-2',',')
				ON Empresa = Empresa_Rpd
				AND Banco = BancoDep_Rpg
				AND Conta = ContaDep_Rpg
			LEFT JOIN Depositos
				ON Empresa_Dep = Empresa_Rpg
				AND Numero_Dep = NumDep_Rpg
				AND Banco_Dep = BancoDep_Rpg
				AND Conta_Dep = ContaDep_Rpg
			WHERE		Tipo_Doc = 1
						AND Data_Dep BETWEEN '01/01/2026' AND '10/11/2050'
			GROUP BY	Data_Dep, Tipo_Rpg, DescTit_Rpg, Numero_Doc, Empresa_Rpd, Obra_Rpd, BancoDep_Rpg, ContaDep_Rpg

			UNION ALL

			/* Cheques devolvidos */
			SELECT		DataDev_Rpg [Data],
						'Cheque devolvido' [Hist],
						CAST(NumDep_Rpg AS VARCHAR) [NumDoc],
						0 [Credito],
						SUM(PercentValor_Rpd) [Debito],
						Empresa_Rpd,
						Obra_Rpd [Obra],
						5 [Origem],
						0 [TipoDet],
						BancoDep_Rpg [Banco],
						ContaDep_Rpg [Conta]
			FROM		RecebePgto
			INNER JOIN Depositos
				ON Empresa_Rpg = Empresa_Dep
				AND NumDep_Rpg = Numero_Dep
				AND BancoDep_Rpg = Banco_Dep
				AND ContaDep_Rpg = Conta_Dep
			INNER JOIN RecebePgtoDiv
				ON Empresa_Rpg = Empresa_Rpd
				AND NumReceb_Rpg = NumReceb_Rpd
				AND Tipo_Rpg = TipoRpg_Rpd
				AND NumCont_Rpg = NumCont_Rpd
			INNER JOIN fn_ListEmpBancoConta ('4|1/10744-X,4|1/10744-G,4|1/10745-G,4|1/10745-X,4|104/580256669-4,4|341/99302-7,4|341/99458-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-G,4|756/127859-2',',')
				ON Empresa = Empresa_Rpd
				AND Banco = BancoDep_Rpg
				AND Conta = ContaDep_Rpg
			WHERE		Status_Rpg = 2
						AND Conciliado_Dep = 1
						AND DataDev_Rpg BETWEEN '01/01/2026' AND '10/11/2050'
			GROUP BY	DataDev_Rpg, NumDep_Rpg, Empresa_Rpd, Obra_Rpd, BancoDep_Rpg, ContaDep_Rpg
) [ExtratoConc]
ORDER BY	ExtratoConc.Banco, ExtratoConc.Conta, ExtratoConc.Data, ExtratoConc.NumDoc
