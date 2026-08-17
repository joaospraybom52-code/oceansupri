SELECT		'07/01/2026' [DataInicio],
			'01/01/2070' [DataTermino],
			Resultado.*,
			UPPER(Desc_Emp) [Desc_Emp],
			UPPER(Nome_Banco) [Nome_Banco]
FROM
(
			SELECT		Empresa_Es [CodEmpresa],
						Banco_Es [NumBanco],
						Conta_Es [NumConta],
						ISNULL(SaldoNaoConcil_Ant,0) [SaldoNaoConcil_Ant],
						ISNULL(SaldoConcil_Ant,0) [SaldoConcil_Ant],
						Data_Es [Data],
						UPPER(Desc_CGer) [Historico],
						CASE WHEN (cheque <> '') AND (SaldoConcil <> 0 )
							THEN 'CHEQUE COMPENSADO ****'
							ELSE UPPER(Desc_CGer)
						END [HistoricoChq],
						NumDoc_Es [Lanct],
						CASE WHEN TipoLanc = 4
							THEN ''
							ELSE Cheque
						END [Cheque],
						Credito,
						Debito,
						CAST(SaldoNaoConcil AS NUMERIC(18,2)) [SaldoNaoConcil_Per],
						CAST(SaldoConcil AS NUMERIC(18,2)) [SaldoConcil_Per],
						TipoLanc,
						0 [ChequesNaoCompensados],
						CAST(Empresa_Es AS VARCHAR) + '_' + CAST(Banco_Es AS VARCHAR) + '_' + Conta_Es + '_' + NumDoc_Es + '_' + Cheque + CASE WHEN TipoLanc = 5 THEN  'Cheque devolvido' ELSE '' END [Chave],
						CASE WHEN TipoLanc IN (1, 30)
							THEN CAST(Empresa_Es AS VARCHAR) + '_' + CAST(Banco_Es AS VARCHAR) + '_' + Conta_Es + '_' + NumDoc_Es + '_' + Cheque + '_CHEQUEEMITIDO'
						END [ChaveChequeEmitido],
						CASE WHEN TipoLanc IN (1, 30, 32) AND TipoLanc2 = 1
							THEN Credito + Debito
							ELSE 0
						END [VlrChqComp],
						CASE WHEN TipoLanc IN (1, 30, 32)
							THEN Credito + Debito
							ELSE 0
						END [VlrChqEmitido],
						ChequeAnterior
			FROM
			(
						/* Aplicações Financeiras */
						SELECT		Empresa_Es,
									Banco_Es,
									Conta_Es,
									Data_Es,
									COALESCE(Desc_Cmf, Desc_CGer, '') [Desc_CGer],
									CAST(Num_Es AS VARCHAR) [NumDoc_Es],
									'' [Cheque],
									SUM
									(
										CASE WHEN EntSai_Es = 0
											THEN Valor_Es
											ELSE 0
										END
									) [Credito],
									SUM
									(
										CASE WHEN EntSai_Es = 1
											THEN Valor_Es
											ELSE 0
										END
									) [Debito],
									SUM
									(
										CASE WHEN EntSai_Es = 0
											THEN Valor_Es
											ELSE 0
										END
										-
										CASE WHEN EntSai_Es = 1
											THEN Valor_Es
											ELSE 0
										END
									) [SaldoNaoConcil],
									SUM
									(
										CASE WHEN EntSai_Es = 0
											THEN Valor_Es
											ELSE 0
										END
										-
										CASE WHEN EntSai_Es = 1
											THEN Valor_Es
											ELSE 0
										END
									) [SaldoConcil],
									0 [TipoLanc],
									-1 [TipoLanc2],
									0 [ChequeAnterior]
						FROM		EntSaiEmpAplic
									LEFT JOIN CategoriasDeMovFin
										ON CategMovFin_Es = Codigo_Cmf
									LEFT JOIN CategoriasDeTipoDeMovimentacao
										ON Natureza_Es = Codigo_CGer
									INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
										ON Empresa = Empresa_es
										AND Banco = Banco_es
										AND Conta = Conta_es
						WHERE		Data_Es BETWEEN '07/01/2026' AND '01/01/2070'
						GROUP BY	Empresa_Es, Banco_Es, Conta_Es, Data_Es, COALESCE(Desc_Cmf, Desc_CGer, ''), Num_Es

						UNION ALL

						/* Transferências - Crédito - Eletrônico */
						SELECT		EmpresaCred_tb,
									BcoCred_Tb,
									ContaCred_Tb,
									Data_Tb,
									LTRIM(ISNULL(Desc_Cmf, '') +' '+ ISNULL(Obs_Tb, '')) [Desc_CGer],
									NumDoc_Tb [NumDoc_Tb],
									'' [Cheque],
									SUM(Valor_Tb) [Credito],
									0 [Debito],
									SUM(Valor_Tb) [SaldoNaoConcil],
									SUM(Valor_Tb) [SaldoConcil],
									Tipo_Tb [TipoLanc],
									-1 [TipoLanc2],
									0 [ChequeAnterior]
						FROM		VwTransfBcoExtrato
									LEFT JOIN CategoriasDeMovFin
										ON CategMovFin_Tb = Codigo_Cmf
									INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
										ON Empresa = EmpresaCred_tb
										AND Banco = BcoCred_tb
										AND Conta = ContaCred_tb
						WHERE		Data_Tb BETWEEN '07/01/2026' AND '01/01/2070'
									AND Tipo_Tb = 2
						GROUP BY	EmpresaCred_tb, BcoCred_Tb, ContaCred_Tb, Desc_Cmf, Obs_Tb, NumDoc_Tb, Data_Tb, Tipo_Tb

						UNION ALL

						/* Transferências - Crédito - Cheques - Não Conciliado*/
						SELECT		EmpresaCred_tb,
									BcoCred_Tb,
									ContaCred_Tb,
									Data_Tb,
									LTRIM(ISNULL(Desc_Cmf, '') + ' ' + ISNULL(Obs_Tb, '')) [Desc_CGer],
									'' [NumDoc_Tb],
									NumDoc_Tb [Cheque],
									SUM(Valor_Tb) [Credito],
									0 [Debito],
									SUM(Valor_Tb) [SaldoNaoConcil],
									0 [SaldoConcil],
									Tipo_Tb [TipoLanc],
									0 [TipoLanc2],
									0 [ChequeAnterior]
						FROM		VwTransfBcoExtrato
									LEFT JOIN CategoriasDeMovFin
										ON CategMovFin_Tb = Codigo_Cmf
									INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
										ON Empresa = EmpresaCred_tb
										AND Banco = BcoCred_tb
										AND Conta = ContaCred_tb
						WHERE		Data_Tb BETWEEN '07/01/2026' AND '01/01/2070'
									AND Tipo_Tb = 1
									AND CreditoConciliado_Doc = 0
						GROUP BY	EmpresaCred_tb, BcoCred_Tb, ContaCred_Tb, Desc_Cmf, Obs_Tb, NumDoc_Tb, Data_Tb, Tipo_Tb

						UNION ALL

						/* Transferências - Crédito - Cheques - Conciliado */
						SELECT		EmpresaCred_tb,
									BcoCred_Tb,
									ContaCred_Tb,
									Data_Tb,
									Desc_CGer,
									'' [NumDoc_Tb],
									Cheque,
									Credito [Credito],
									0 [Debito],
									SUM(SaldoNaoConcil) [SaldoNaoConcil],
									SUM(SaldoConcil) [SaldoConcil],
									TipoLanc,
									1 [TipoLanc2],
									0 [ChequeAnterior]
						FROM
						(
									/* Saldo Não Conciliado */
									SELECT		EmpresaCred_tb,
												BcoCred_Tb,
												ContaCred_Tb,
												Data_Tb,
												LTRIM(ISNULL(Desc_Cmf, '') + ' ' + ISNULL(Obs_Tb, '')) [Desc_CGer],
												NumDoc_Tb [Cheque],
												Valor_Tb [Credito],
												Valor_Tb [SaldoNaoConcil],
												0 [SaldoConcil],
												CASE WHEN DataConcilCredito_Doc BETWEEN '07/01/2026' AND '01/01/2070' AND Data_Tb <> DataConcilCredito_Doc
													THEN 11
													ELSE Tipo_Tb
												END [TipoLanc]
									FROM		VwTransfBcoExtrato
												LEFT JOIN CategoriasDeMovFin
													ON CategMovFin_Tb = Codigo_Cmf
												INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
													ON Empresa = EmpresaCred_tb
													AND Banco = BcoCred_tb
													AND Conta = ContaCred_tb
									WHERE		Data_Tb BETWEEN '07/01/2026' AND '01/01/2070'
												AND Tipo_Tb = 1
												AND CreditoConciliado_Doc = 1

									UNION

									/* Saldo Conciliado */
									SELECT		EmpresaCred_tb,
												BcoCred_Tb,
												ContaCred_Tb,
												DataConcilCredito_Doc,
												LTRIM(ISNULL(Desc_Cmf, '') + ' ' + ISNULL(Obs_Tb, '')) [Desc_CGer],
												NumDoc_Tb [Cheque],
												Valor_Tb [Credito],
												0 [SaldoNaoConcil],
												Valor_Tb [SaldoConcil],
												Tipo_Tb [TipoLanc]
									FROM		VwTransfBcoExtrato
												LEFT JOIN CategoriasDeMovFin
													ON CategMovFin_Tb = Codigo_Cmf
												INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
													ON Empresa = EmpresaCred_tb
													AND Banco = BcoCred_tb
													AND Conta = ContaCred_tb
									WHERE		DataConcilCredito_Doc BETWEEN '07/01/2026' AND '01/01/2070'
												AND Tipo_Tb = 1
												AND CreditoConciliado_Doc = 1
						) [TransfChqConcil]
						GROUP BY	EmpresaCred_tb, BcoCred_Tb, ContaCred_Tb, Data_Tb, Desc_CGer, Cheque, Credito, TipoLanc

						UNION ALL

						/* Transferências - Débito - Eletrônico */
						SELECT		Empresa_Tb,
									BcoDeb_Tb,
									ContaDeb_Tb,
									Data_Tb,
									LTRIM(ISNULL(Desc_Cmf, '') + ' ' + ISNULL(Obs_Tb, '')) [Desc_CGer],
									NumDoc_Tb [NumDoc_Tb],
									'' [Cheque],
									0 [Credito],
									SUM(Valor_Tb) [Debito],
									-SUM(Valor_Tb) [SaldoNaoConcil],
									-SUM(Valor_Tb) [SaldoConcil],
									Tipo_Tb [TipoLanc],
									-1 [TipoLanc2],
									0 [ChequeAnterior]
						FROM		VwTransfBcoExtrato
									LEFT JOIN CategoriasDeMovFin
										ON CategMovFin_Tb = Codigo_Cmf
									INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
										ON Empresa = Empresa_tb
										AND Banco = BcoDeb_tb
										AND Conta = ContaDeb_tb
						WHERE		Data_Tb BETWEEN '07/01/2026' AND '01/01/2070'
									AND Tipo_Tb = 2
						GROUP BY	Empresa_Tb, BcoDeb_Tb, ContaDeb_Tb, Desc_Cmf, Obs_Tb, NumDoc_Tb, Data_Tb, Tipo_Tb

						UNION ALL

						/* Transferências - Débito - Cheques - Não Conciliado*/
						SELECT		Empresa_Tb,
									BcoDeb_Tb,
									ContaDeb_Tb,
									Data_Tb,
									LTRIM(ISNULL(Desc_Cmf, '') + ' ' + ISNULL(Obs_Tb, '')) [Desc_CGer],
									'' [NumDoc_Tb],
									NumDoc_Tb [Cheque],
									0 [Credito],
									SUM(Valor_Tb) [Debito],
									-SUM(Valor_Tb) [SaldoNaoConcil],
									0 [SaldoConcil],
									Tipo_Tb [TipoLanc],
									0 [TipoLanc2],
									0 [ChequeAnterior]
						FROM		VwTransfBcoExtrato
									LEFT JOIN CategoriasDeMovFin
										ON CategMovFin_Tb = Codigo_Cmf
									INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
										ON Empresa = Empresa_tb
										AND Banco = BcoDeb_tb
										AND Conta = ContaDeb_tb
						WHERE		Data_Tb BETWEEN '07/01/2026' AND '01/01/2070'
									AND Tipo_Tb = 1
									AND DebitoConciliado_Doc = 0
						GROUP BY	Empresa_Tb, BcoDeb_Tb, ContaDeb_Tb, Desc_Cmf, Obs_Tb, NumDoc_Tb, Data_Tb, Tipo_Tb

						UNION ALL

						/* Transferências - Débito - Cheques - Conciliado */
						SELECT		Empresa_Tb,
									BcoDeb_Tb,
									ContaDeb_Tb,
									Data_Tb,
									Desc_CGer,
									'' [NumDoc_Tb],
									Cheque,
									0 [Credito],
									Debito,
									-SUM(SaldoNaoConcil) [SaldoNaoConcil],
									-SUM(SaldoConcil) [SaldoConcil],
									TipoLanc,
									1 [TipoLanc2],
									0 [ChequeAnterior]
						FROM
						(
									/* Saldo Não Conciliado */
									SELECT		Empresa_Tb,
												BcoDeb_Tb,
												ContaDeb_Tb,
												Data_Tb,
												LTRIM(ISNULL(Desc_Cmf, '') + ' ' + ISNULL(Obs_Tb, '')) [Desc_CGer],
												NumDoc_Tb [Cheque],
												Valor_Tb [Debito],
												Valor_Tb [SaldoNaoConcil],
												0 [SaldoConcil],
												CASE WHEN DataConcilDebito_Doc BETWEEN '07/01/2026' AND '01/01/2070' AND Data_Tb <> DataConcilCredito_Doc
													THEN 11
													ELSE Tipo_Tb
												END [TipoLanc]
									FROM		VwTransfBcoExtrato
												LEFT JOIN CategoriasDeMovFin
													ON CategMovFin_Tb = Codigo_Cmf
												INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
													ON Empresa = Empresa_tb
													AND Banco = BcoDeb_tb
													AND Conta = ContaDeb_tb
									WHERE		Data_Tb BETWEEN '07/01/2026' AND '01/01/2070'
												AND Tipo_Tb = 1
												AND DebitoConciliado_Doc = 1

									UNION

									/* Saldo Conciliado */
									SELECT		Empresa_Tb,
												BcoDeb_Tb,
												ContaDeb_Tb,
												DataConcilDebito_Doc,
												LTRIM(ISNULL(Desc_Cmf, '') + ' ' + ISNULL(Obs_Tb, '')) [Desc_CGer],
												NumDoc_Tb [Cheque],
												Valor_Tb [Debito],
												0 [SaldoNaoConcil],
												Valor_Tb [SaldoConcil],
												Tipo_Tb [TipoLanc]
									FROM		VwTransfBcoExtrato
												LEFT JOIN CategoriasDeMovFin
													ON CategMovFin_Tb = Codigo_Cmf
												INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
													ON Empresa = Empresa_tb
													AND Banco = BcoDeb_tb
													AND Conta = ContaDeb_tb
									WHERE		DataConcilDebito_Doc BETWEEN '07/01/2026' AND '01/01/2070'
												AND Tipo_Tb = 1
												AND DebitoConciliado_Doc = 1
						) [TransfChqConcil]
						GROUP BY	Empresa_Tb, BcoDeb_Tb, ContaDeb_Tb, Data_Tb, Desc_CGer, Cheque, Debito, TipoLanc

						UNION ALL

						/* Cheques, Débitos C/C, Débitos Eletrônicos e Borderôs */
						SELECT		Empresa_Pag,
									BancoProc_Pag,
									Conta_Pag,
									DataEmissao_Pag,
									Nominal,
									NumDoc_Pag,
									NumChq_Pag,
									Credito,
									Debito,
									SUM(SaldoNaoConcil) [SaldoNaoConcil],
									SUM(SaldoConcil) [SaldoConcil],
									TipoLanc,
									TipoLanc2,
									ChequeAnterior
						FROM
						(
									SELECT		Empresa_Pag,
												BancoProc_Pag,
												Conta_Pag,
												DataEmissao_Pag,
												ChqNome_Pag [Nominal],
												CAST(NumProc_Pag AS VARCHAR) + '/' + CAST(NumParc_Pag AS VARCHAR) [NumDoc_Pag],
												CASE WHEN Tipo_Chq IN ('Débito C/C', 'Débito Eletrônico')
													THEN ''
													ELSE NumChq_Pag
												END [NumChq_Pag],
												0 [Credito],
												SUM(ValorProc_Pag) [Debito],
												-SUM(ValorProc_Pag) [SaldoNaoConcil],
												0 [SaldoConcil],
												MAX
												(
													CASE
														WHEN Tipo_Chq = 'Débito C/C'
															THEN 31
														WHEN Tipo_Chq = 'Cheque Avulso'
															THEN
																CASE WHEN Data_Doc BETWEEN '07/01/2026' AND '01/01/2070' AND DataEmissao_Pag <> Data_Doc
																	THEN 11
																	ELSE 30
																END
														ELSE 32
													END
												) [TipoLanc],
												CASE WHEN Tipo_Chq IN ('Débito C/C', 'Débito Eletrônico')
													THEN -1
													ELSE
														CASE WHEN Data_Doc IS NULL
															THEN 0
															ELSE 1
														END
												END [TipoLanc2],
												0 [ChequeAnterior]
									FROM		ContasPagas
												INNER JOIN CheqEmissao
													ON Empresa_Pag = Empresa_Chq
													AND BancoProc_Pag = NumBank_Chq
													AND Conta_Pag = Conta_Chq
													AND NumChq_Pag = Num_Chq
												LEFT JOIN Extrato
													ON Empresa_Chq = Empresa_Doc
													AND Conta_Chq = Conta_Doc
													AND Num_Chq = Numero_Doc
													AND NumBank_Chq = Banco_Doc
												INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
													ON Empresa = Empresa_pag
													AND Banco = BancoProc_Pag
													AND Conta = Conta_Pag
									WHERE		DataEmissao_Pag BETWEEN '07/01/2026' AND '01/01/2070'
									GROUP BY	Empresa_Pag, BancoProc_Pag, Conta_Pag, DataEmissao_Pag, NumChq_Pag, ChqNome_Pag, NumProc_Pag, NumParc_Pag, Tipo_Chq, Data_Doc

									UNION

									SELECT		Empresa_Doc,
												Banco_Doc,
												Conta_Doc,
												Data_Doc,
												ChqNome_Pag [Nominal],
												CAST(NumProc_Pag AS VARCHAR) + '/' + CAST(NumParc_Pag AS VARCHAR) [NumDoc_Pag],
												CASE WHEN Tipo_Chq IN ('Débito C/C', 'Débito Eletrônico')
													THEN ''
													ELSE NumChq_Pag
												END [NumChq_Pag],
												0 [Credito],
												SUM(ValorProc_Pag) [Debito],
												0 [SaldoNaoConcil],
												-SUM(ValorProc_Pag) [SaldoConcil],
												MAX
												(
													CASE
														WHEN Tipo_Chq = 'Débito C/C'
															THEN 31
														WHEN Tipo_Chq = 'Cheque Avulso'
															THEN 30
														ELSE 32
													END
												) [TipoLanc],
												CASE WHEN Tipo_Chq IN ('Débito C/C', 'Débito Eletrônico')
													THEN -1
													ELSE 1
												END [TipoLanc2],
												CASE WHEN Data_Chq < '07/01/2026'
													THEN 1
													ELSE 0
												END [ChequeAnterior]
									FROM		ContasPagas
												INNER JOIN CheqEmissao
													ON Empresa_Pag = Empresa_Chq
													AND BancoProc_Pag = NumBank_Chq
													AND Conta_Pag = Conta_Chq
													AND NumChq_Pag = Num_Chq
												INNER JOIN Extrato
													ON Empresa_Chq = Empresa_Doc
													AND Conta_Chq = Conta_Doc
													AND Num_Chq = Numero_Doc
													AND NumBank_Chq = Banco_Doc
												INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
													ON Empresa = Empresa_doc
													AND Banco = Banco_doc
													AND Conta = Conta_doc
									WHERE		Data_Doc BETWEEN '07/01/2026' AND '01/01/2070'
												AND Status_Doc = 2
									GROUP BY	Empresa_Doc, Banco_Doc, Conta_Doc, Data_Doc, NumChq_Pag, ChqNome_Pag, NumProc_Pag, NumParc_Pag, Tipo_Chq, Data_Chq
						) [ProcPag]
						GROUP BY	Empresa_Pag, BancoProc_Pag, Conta_Pag, DataEmissao_Pag, Nominal, NumDoc_Pag, NumChq_Pag, Credito, Debito, TipoLanc, TipoLanc2, ChequeAnterior

						UNION ALL

						/*  Depósitos */
						SELECT		Empresa_Dep,
									Banco_Dep,
									Conta_Dep,
									Data_Dep,
									Cliente,
									Numero_Dep,
									'' [Cheque],
									Credito,
									Debito,
									SUM(SaldoNaoConcil) [SaldoNaoConcil],
									SUM(SaldoConcil) [SaldoConcil],
									TipoLanc,
									-1 [TipoLanc2],
									0 [ChequeAnterior]
						FROM
						(
									/* Não Conciliado */
									SELECT		Empresa_Dep,
												Banco_Dep,
												Conta_Dep,
												Data_Dep,
												ISNULL(Nome_Pes, '') + ', ' + ISNULL(Historico_Rpg, '') [Cliente],
												CAST(Numero_Dep AS VARCHAR) [Numero_Dep],
												SUM(Valor_Rpg) [Credito],
												0 [Debito],
												SUM(Valor_Rpg) [SaldoNaoConcil],
												0 [SaldoConcil],
												CASE WHEN Data_Doc BETWEEN '07/01/2026' AND '01/01/2070' AND Data_Dep <> Data_Doc
													THEN 44
													ELSE 4
												END [TipoLanc],
												Status_Rpg
									FROM		Depositos
												INNER JOIN
												(
													SELECT		Empresa_Rpg,
																NumReceb_Rpg,
																Tipo_Rpg,
																NumCont_Rpg,
																NumDep_Rpg,
																Cheque_Rpg,
																BancoDep_Rpg,
																ContaDep_Rpg,
																Cliente_Rpg,
																Status_Rpg,
																MAX(Valor_Rpg) [Valor_Rpg],
																MAX(Tipo_Rec + '.' + (CAST(NumParc_Rec AS VARCHAR) + '/' + CAST(TotParcGrupo_Rec AS VARCHAR)) + ', VENC.' +
																	CASE WHEN DAY(DataVenci_Rec) < 10
																		THEN '0'
																		ELSE ''
																	END + CAST(DAY(DataVenci_Rec) AS VARCHAR) + '/' +
																	CASE WHEN MONTH(DataVenci_Rec) < 10
																		THEN '0'
																		ELSE ''
																	END + CAST(MONTH(DataVenci_Rec) AS VARCHAR) + '/' + CAST(YEAR(DataVenci_Rec) AS VARCHAR) + ', ' + Identificador_Itr + ', ' + Obra_Rec) [Historico_Rpg]
													FROM		RecebePgto
																INNER JOIN RecebePgtoDiv
																	ON Empresa_Rpg = Empresa_Rpd
																	AND NumReceb_Rpg = NumReceb_Rpd
																	AND Tipo_Rpg = TipoRpg_Rpd
																	AND NumCont_Rpg = NumCont_Rpd
																LEFT JOIN Recebidas
																	ON Empresa_Rpd = Empresa_Rec
																	AND NumVend_Rpd = NumVend_Rec
																	AND Obra_Rpd = Obra_Rec
																	AND NumParc_Rpd = NumParc_Rec
																	AND NumParcGer_Rpd = NumParcGer_Rec
																	AND Tipo_Rpd = Tipo_Rec
																	AND ParcType_Rpd = ParcType_Rec
																LEFT JOIN
																(
																	SELECT		Empresa_Itr,
																				Obra_Itr,
																				NumVend_Itr,
																				ISNULL(Identificador_Unid, '') [Identificador_Itr]
																	FROM		(
																					SELECT		ItensRecebidas.Empresa_Itr,
																								ItensRecebidas.Obra_Itr,
																								ItensRecebidas.NumVend_Itr,
																								ItensRecebidas.Produto_Itr,
																								MAX(CodPerson_Itr) [CodPerson_Itr]
																					FROM		ItensRecebidas
																								INNER JOIN
																								(
																									SELECT		Empresa_Itr,
																												Obra_Itr,
																												NumVend_Itr,
																												MAX(Produto_Itr) [Produto_Itr]
																									FROM		ItensRecebidas
																									GROUP BY	Empresa_Itr, Obra_Itr, NumVend_Itr
																								) [ItemRecProd]
																									ON ItensRecebidas.Empresa_Itr = ItemRecProd.Empresa_Itr
																									AND ItensRecebidas.Obra_Itr = ItemRecProd.Obra_Itr
																									AND ItensRecebidas.NumVend_Itr = ItemRecProd.NumVend_Itr
																									AND ItensRecebidas.Produto_Itr = ItemRecProd.Produto_Itr
																					GROUP BY	ItensRecebidas.Empresa_Itr, ItensRecebidas.Obra_Itr, ItensRecebidas.NumVend_Itr, ItensRecebidas.Produto_Itr
																				) [ItensRecebidas]
																				LEFT JOIN UnidadePer
																					ON Empresa_Itr = Empresa_Unid
																					AND Produto_Itr = Prod_Unid
																					AND CodPerson_Itr = NumPer_Unid
																) [ItensRecebidas]
																	ON Empresa_Rec = Empresa_Itr
																	AND Obra_Rec = Obra_Itr
																	AND NumVend_Rec = NumVend_Itr
													GROUP BY	Empresa_Rpg, NumReceb_Rpg, Tipo_Rpg, NumCont_Rpg, NumDep_Rpg, BancoDep_Rpg, ContaDep_Rpg, Cliente_Rpg, Status_Rpg, Cheque_Rpg
												) [RecebePgto]
													ON Empresa_Dep = Empresa_Rpg
													AND Numero_Dep = NumDep_Rpg
													AND Banco_Dep = BancoDep_Rpg
													AND Conta_Dep = ContaDep_Rpg
												INNER JOIN Pessoas
													ON Cliente_Rpg = Cod_Pes
												LEFT JOIN Extrato
													ON BancoDep_Rpg = Banco_Doc
													AND Empresa_Rpg = Empresa_Doc
													AND ContaDep_Rpg = Conta_Doc
													AND CAST(NumDep_Rpg AS VARCHAR) = Numero_Doc
													AND Tipo_Doc = 1
												INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
													ON Empresa = Empresa_dep
													AND Banco = Banco_Dep
													AND Conta = Conta_Dep
									WHERE		Data_Dep BETWEEN '07/01/2026' AND '01/01/2070'
									GROUP BY	Empresa_Dep, Banco_Dep, Conta_Dep, Data_Dep, Data_Doc, CAST(Numero_Dep AS VARCHAR), Nome_Pes, Historico_Rpg, Cheque_Rpg, Status_Rpg

									UNION

									/* Conciliado */
									SELECT		Empresa_Dep,
												Banco_Dep,
												Conta_Dep,
												Data_Doc,
												ISNULL(Nome_Pes, '') + ', ' + ISNULL(Historico_Rpg, '') [Cliente],
												CAST(Numero_Dep AS VARCHAR),
												SUM(CAST(Valor_Rpg AS NUMERIC(18,2))) [Credito],
												0 [Debito],
												0 [SaldoNaoConcil],
												SUM(Valor_Rpg) [SaldoConcil],
												4 [TipoLanc],
												Status_Rpg
									FROM		Depositos
												INNER JOIN
												(
													SELECT		Empresa_Rpg,
																NumReceb_Rpg,
																Tipo_Rpg,
																NumCont_Rpg,
																NumDep_Rpg,
																Cheque_Rpg,
																BancoDep_Rpg,
																ContaDep_Rpg,
																Cliente_Rpg,
																Status_Rpg,
																MAX(Valor_Rpg) [Valor_Rpg],
																MAX(Tipo_Rec + '.' + (CAST(NumParc_Rec AS VARCHAR) + '/' + CAST(TotParcGrupo_Rec AS VARCHAR)) + ', VENC.' +
																	CASE WHEN DAY(DataVenci_Rec) < 10
																		THEN '0'
																		ELSE ''
																	END + CAST(DAY(DataVenci_Rec) AS VARCHAR) + '/' +
																	CASE WHEN MONTH(DataVenci_Rec) < 10
																		THEN '0'
																		ELSE ''
																	END + CAST(MONTH(DataVenci_Rec) AS VARCHAR) + '/' + CAST(YEAR(DataVenci_Rec) AS VARCHAR) + ', ' + Identificador_Itr + ', ' + Obra_Rec) [Historico_Rpg],DataDev_Rpg
													FROM		RecebePgto
																INNER JOIN RecebePgtoDiv
																	ON Empresa_Rpg = Empresa_Rpd
																	AND NumReceb_Rpg = NumReceb_Rpd
																	AND Tipo_Rpg = TipoRpg_Rpd
																	AND NumCont_Rpg = NumCont_Rpd
																LEFT JOIN Recebidas
																	ON Empresa_Rpd = Empresa_Rec
																	AND NumVend_Rpd = NumVend_Rec
																	AND Obra_Rpd = Obra_Rec
																	AND NumParc_Rpd = NumParc_Rec
																	AND NumParcGer_Rpd = NumParcGer_Rec
																	AND Tipo_Rpd = Tipo_Rec
																	AND ParcType_Rpd = ParcType_Rec
																LEFT JOIN
																(
																	SELECT		Empresa_Itr,
																				Obra_Itr,
																				NumVend_Itr,
																				ISNULL(Identificador_Unid, '') [Identificador_Itr]
																	FROM		(
																					SELECT		ItensRecebidas.Empresa_Itr,
																								ItensRecebidas.Obra_Itr,
																								ItensRecebidas.NumVend_Itr,
																								ItensRecebidas.Produto_Itr,
																								MAX(CodPerson_Itr) [CodPerson_Itr]
																					FROM		ItensRecebidas
																								INNER JOIN
																								(
																									SELECT		Empresa_Itr,
																												Obra_Itr,
																												NumVend_Itr,
																												MAX(Produto_Itr) [Produto_Itr]
																									FROM		ItensRecebidas
																									GROUP BY	Empresa_Itr, Obra_Itr, NumVend_Itr
																								) [ItemRecProd]
																									ON ItensRecebidas.Empresa_Itr = ItemRecProd.Empresa_Itr
																									AND ItensRecebidas.Obra_Itr = ItemRecProd.Obra_Itr
																									AND ItensRecebidas.NumVend_Itr = ItemRecProd.NumVend_Itr
																									AND ItensRecebidas.Produto_Itr = ItemRecProd.Produto_Itr
																					GROUP BY	ItensRecebidas.Empresa_Itr, ItensRecebidas.Obra_Itr, ItensRecebidas.NumVend_Itr, ItensRecebidas.Produto_Itr
																				) [ItensRecebidas]
																				LEFT JOIN UnidadePer
																					ON Empresa_Itr = Empresa_Unid
																					AND Produto_Itr = Prod_Unid
																					AND CodPerson_Itr = NumPer_Unid
																) [ItensRecebidas]
																	ON Empresa_Rec = Empresa_Itr
																	AND Obra_Rec = Obra_Itr
																	AND NumVend_Rec = NumVend_Itr
													GROUP BY	Empresa_Rpg, NumReceb_Rpg, Tipo_Rpg, NumCont_Rpg, NumDep_Rpg, BancoDep_Rpg, ContaDep_Rpg, Cliente_Rpg, Status_Rpg, Cheque_Rpg,DataDev_Rpg
												) [RecebePgto]
													ON Empresa_Dep = Empresa_Rpg
													AND Numero_Dep = NumDep_Rpg
													AND Banco_Dep = BancoDep_Rpg
													AND Conta_Dep = ContaDep_Rpg
												INNER JOIN Pessoas
													ON Cliente_Rpg = Cod_Pes
												INNER JOIN Extrato
													ON BancoDep_Rpg = Banco_Doc
													AND Empresa_Rpg = Empresa_Doc
													AND ContaDep_Rpg = Conta_Doc
													AND CAST(NumDep_Rpg AS VARCHAR) = Numero_Doc
													AND Tipo_Doc = 1
												INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
													ON Empresa = Empresa_dep
													AND Banco = Banco_Dep
													AND Conta = Conta_Dep
									WHERE		(Data_Doc BETWEEN '07/01/2026' AND '01/01/2070' AND Status_Rpg = 1)
												OR
												((DataDev_Rpg >= '07/01/2026' AND
												Data_Dep BETWEEN '07/01/2026' AND '01/01/2070')
												AND Status_Rpg = 2)
									GROUP BY	Empresa_Dep, Banco_Dep, Conta_Dep, Data_Doc, CAST(Numero_Dep AS VARCHAR), Nome_Pes, Historico_Rpg, Cheque_Rpg,Status_Rpg
						) [Depositos]
						GROUP BY	Empresa_Dep, Banco_Dep, Conta_Dep, Data_Dep, Cliente, Numero_Dep, Credito, Debito, TipoLanc,Status_Rpg

						UNION ALL

						/* Cheque Devolvido */
						SELECT		Empresa_Rpg [Empresa_Rpgd],
									BancoDep_Rpg [Banco_Rpgd],
									ContaDep_Rpg [Conta_Rpgd],
									DataDev_Rpg,
									'**Cheque recebido devolvido** ' + ISNULL(Nome_Pes, '') + ', ' + ISNULL(Historico_Rpg, '') [Cliente],
									CAST(Numero_Dep AS VARCHAR),
									'' [Cheque],
									0 [Credito],
									SUM(Valor_Rpg) [Debito],
									-SUM(Valor_Rpg) [SaldoNaoConcil],
									-SUM
									(
										CASE WHEN Conciliado_Dep = 1
											THEN Valor_Rpg
											ELSE 0
										END
									) [SaldoConcil],
									5 [TipoLanc],
									-1 [TipoLanc2],
									0 [ChequeAnterior]
						FROM
						(
									SELECT		Empresa_Rpg,
												NumReceb_Rpg,
												Tipo_Rpg,
												NumCont_Rpg,
												NumDep_Rpg,
												BancoDep_Rpg,
												ContaDep_Rpg,
												Cliente_Rpg,
												DataDev_Rpg,
												Status_Rpg,
												MAX(Valor_Rpg) [Valor_Rpg],
												MAX(Tipo_Rec + '.' + (CAST(NumParc_Rec AS VARCHAR) + '/' + CAST(TotParcGrupo_Rec AS VARCHAR)) + ', VENC.' +
													CASE WHEN DAY(DataVenci_Rec) < 10
														THEN '0'
														ELSE ''
													END + CAST(DAY(DataVenci_Rec) AS VARCHAR) + '/' +
													CASE WHEN MONTH(DataVenci_Rec) < 10
														THEN '0'
														ELSE ''
													END + CAST(MONTH(DataVenci_Rec) AS VARCHAR) + '/' + CAST(YEAR(DataVenci_Rec) AS VARCHAR) + ', ' + Identificador_Itr + ', ' + Obra_Rec) [Historico_Rpg]
									FROM		RecebePgto
												LEFT JOIN RecebePgtoDiv
													ON Empresa_Rpg = Empresa_Rpd
													AND NumReceb_Rpg = NumReceb_Rpd
													AND Tipo_Rpg = TipoRpg_Rpd
													AND NumCont_Rpg = NumCont_Rpd
												LEFT JOIN Recebidas
													ON Empresa_Rpd = Empresa_Rec
													AND NumVend_Rpd = NumVend_Rec
													AND Obra_Rpd = Obra_Rec
													AND NumParc_Rpd = NumParc_Rec
													AND NumParcGer_Rpd = NumParcGer_Rec
													AND Tipo_Rpd = Tipo_Rec
													AND ParcType_Rpd = ParcType_Rec
												LEFT JOIN
												(
													SELECT		Empresa_Itr,
																Obra_Itr,
																NumVend_Itr,
																ISNULL(Identificador_Unid, '') [Identificador_Itr]
													FROM		(
																	SELECT		ItensRecebidas.Empresa_Itr, ItensRecebidas.Obra_Itr, ItensRecebidas.NumVend_Itr, ItensRecebidas.Produto_Itr, MAX(CodPerson_Itr) [CodPerson_Itr]
																	FROM		ItensRecebidas
																				INNER JOIN
																				(
																					SELECT		Empresa_Itr,
																								Obra_Itr,
																								NumVend_Itr,
																								MAX(Produto_Itr) [Produto_Itr]
																					FROM		ItensRecebidas
																					GROUP BY	Empresa_Itr, Obra_Itr, NumVend_Itr
																				) [ItemRecProd]
																					ON ItensRecebidas.Empresa_Itr = ItemRecProd.Empresa_Itr
																					AND ItensRecebidas.Obra_Itr = ItemRecProd.Obra_Itr
																					AND ItensRecebidas.NumVend_Itr = ItemRecProd.NumVend_Itr
																					AND ItensRecebidas.Produto_Itr = ItemRecProd.Produto_Itr
																	GROUP BY	ItensRecebidas.Empresa_Itr, ItensRecebidas.Obra_Itr, ItensRecebidas.NumVend_Itr, ItensRecebidas.Produto_Itr
																) [ItensRecebidas]
																LEFT JOIN UnidadePer
																	ON Empresa_Itr = Empresa_Unid
																	AND Produto_Itr = Prod_Unid
																	AND CodPerson_Itr = NumPer_Unid
												) [ItensRecebidas]
													ON Empresa_Rec = Empresa_Itr
													AND Obra_Rec = Obra_Itr
													AND NumVend_Rec = NumVend_Itr
									GROUP BY	Empresa_Rpg, NumReceb_Rpg, Tipo_Rpg, NumCont_Rpg, NumDep_Rpg, BancoDep_Rpg, ContaDep_Rpg, Cliente_Rpg, DataDev_Rpg, Status_Rpg
						) [RecebePgto]
									LEFT JOIN Depositos
										ON Empresa_Rpg = Empresa_Dep
										AND NumDep_Rpg = Numero_Dep
										AND BancoDep_Rpg = Banco_Dep
										AND ContaDep_Rpg = Conta_Dep
									LEFT JOIN Pessoas
										ON Cliente_Rpg = Cod_Pes
									INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
										ON Empresa = Empresa_Rpg
										AND Banco = BancoDep_Rpg
										AND Conta = ContaDep_Rpg
						WHERE		DataDev_Rpg BETWEEN '07/01/2026' AND '01/01/2070'
									AND Status_Rpg = 2
						GROUP BY	Empresa_Rpg, BancoDep_Rpg, ContaDep_Rpg, DataDev_Rpg, Nome_Pes, Historico_Rpg, Numero_Dep
			) [Lancamentos]
						LEFT JOIN
						(
							SELECT		Empresa_Banco [Empresa_Ant],
										Numero_Banco [Banco_Ant],
										Conta_Banco [Conta_Ant],
										ISNULL(Valor_Doc, 0) + ISNULL(Valor_Es, 0) + ISNULL(Valor_Tbcc, 0) + ISNULL(Valor_Tbdc, 0) + ISNULL(Valor_Rpgdc, 0) + ISNULL(Valor_Rpgc, 0) [SaldoConcil_Ant],
										ISNULL(ValorProc_Pag, 0) + ISNULL(Valor_Es, 0) + ISNULL(Valor_Tbc, 0) + ISNULL(Valor_Tbd, 0) + ISNULL(Valor_Rpg, 0) + ISNULL(Valor_Rpgd, 0) [SaldoNaoConcil_Ant]
							FROM		CCorrente
										LEFT JOIN
										(
											SELECT		Empresa_Es,
														Banco_Es,
														Conta_Es,
														SUM
														(
															CASE EntSai_Es
																WHEN 0 THEN 1
																WHEN 1 THEN -1
															END * Valor_Es
														) [Valor_Es]
											FROM		EntSaiEmpAplic
														INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
															ON Empresa = Empresa_es
															AND Banco = Banco_es
															AND Conta = Conta_es
											WHERE		Data_Es < '07/01/2026'
											GROUP BY	Empresa_Es, Banco_Es, Conta_Es
										) [SaldoAntES]
											ON Empresa_Banco = Empresa_Es
											AND Numero_Banco = Banco_Es
											AND Conta_Banco = Conta_Es
										LEFT JOIN
										(
											SELECT		Empresa_Tb [Empresa_Tbc],
														BcoCred_Tb [Banco_Tbc],
														ContaCred_Tb [Conta_Tbc],
														SUM(Valor_Tb) [Valor_Tbc],
														SUM
														(
															CASE WHEN CreditoConciliado_Doc = 1 AND DataConcilCredito_doc < '07/01/2026'
																THEN Valor_Tb
																ELSE 0
															END
														) [Valor_Tbcc]
											FROM		VwTransfBcoExtrato
														INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
															ON Empresa = EmpresaCred_tb
															AND Banco = BcoCred_tb
															AND Conta = ContaCred_tb
											WHERE		Data_Tb < '07/01/2026'
											GROUP BY	Empresa_Tb, BcoCred_Tb, ContaCred_Tb
										) [TrfCred]
											ON Empresa_Banco = Empresa_Tbc
											AND Numero_Banco = Banco_Tbc
											AND Conta_Banco = Conta_Tbc
										LEFT JOIN
										(
											SELECT		Empresa_Tb [Empresa_Tbd],
														BcoDeb_Tb [Banco_Tbd],
														ContaDeb_Tb [Conta_Tbd],
														-SUM(Valor_Tb) [Valor_Tbd],
														-SUM
														(
															CASE WHEN DebitoConciliado_Doc = 1 AND DataConcilDebito_doc < '07/01/2026'
																THEN Valor_Tb
																ELSE 0
															END
														) [Valor_Tbdc]
											FROM		VwTransfBcoExtrato
														INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
															ON Empresa = Empresa_tb
															AND Banco = BcoDeb_tb
															AND Conta = ContaDeb_tb
											WHERE		Data_Tb < '07/01/2026'
											GROUP BY	Empresa_Tb, BcoDeb_Tb, ContaDeb_Tb
										) [TrfDeb]
											ON Empresa_Banco = Empresa_Tbd
											AND Numero_Banco = Banco_Tbd
											AND Conta_Banco = Conta_Tbd
										LEFT JOIN
										(
											 SELECT		Empresa_Pag,
														BancoProc_Pag,
														Conta_Pag,
														-SUM(ValorProc_Pag) [ValorProc_Pag]
											FROM		ContasPagas
														INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
															ON Empresa = Empresa_pag
															AND Banco = BancoProc_Pag
															AND Conta = Conta_Pag
											WHERE		DataEmissao_Pag < '07/01/2026'
											GROUP BY	Empresa_Pag, BancoProc_Pag, Conta_Pag
										) [SaldoAntCP]
											ON Empresa_Banco = Empresa_Pag
											AND Numero_Banco = BancoProc_Pag
											AND Conta_Banco = Conta_Pag
										LEFT JOIN
										(
											SELECT		Empresa_Doc,
														Banco_Doc,
														Conta_Doc,
														-SUM(Valor_Doc) [Valor_Doc]
											FROM		CheqEmissao
														INNER JOIN Extrato
															ON Empresa_Chq = Empresa_Doc
															AND NumBank_Chq = Banco_Doc
															AND Conta_Chq = Conta_Doc
															AND Num_Chq = Numero_Doc
														INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
															ON Empresa = Empresa_doc
															AND Banco = Banco_doc
															AND Conta = Conta_doc
											WHERE		Data_Doc < '07/01/2026'
														AND Status_Doc = 2
											GROUP BY	Empresa_Doc, Banco_Doc, Conta_Doc
										) [SaldoAntCPConc]
											ON Empresa_Banco = Empresa_Doc
											AND Numero_Banco = Banco_Doc
											AND Conta_Banco = Conta_Doc
										LEFT JOIN
										(
											SELECT		Empresa_Rpg [Empresa_Rpgdc],
														BancoDep_Rpg [Banco_Rpgdc],
														ContaDep_Rpg [Conta_Rpgdc],
														-SUM(Valor_Rpg) [Valor_Rpgdc]
											FROM		RecebePgto
														INNER JOIN Depositos
															ON Empresa_Rpg = Empresa_Dep
															AND NumDep_Rpg = Numero_Dep
															AND BancoDep_Rpg = Banco_Dep
															AND ContaDep_Rpg = Conta_Dep
														INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
															ON Empresa = Empresa_Rpg
															AND Banco = BancoDep_Rpg
															AND Conta = ContaDep_Rpg
											WHERE		DataDev_Rpg < '07/01/2026'
														AND Status_Rpg = 2
														AND Conciliado_Dep = 1
											GROUP BY	Empresa_Rpg, BancoDep_Rpg, ContaDep_Rpg
										) [RecebDevConcil]
											ON Empresa_Banco = Empresa_Rpgdc
											AND Numero_Banco = Banco_Rpgdc
											AND Conta_Banco = Conta_Rpgdc
										LEFT JOIN
										(
											SELECT		Empresa_Rpg [Empresa_Rpgd],
														BancoDep_Rpg [Banco_Rpgd],
														ContaDep_Rpg [Conta_Rpgd],
														-SUM(Valor_Rpg) [Valor_Rpgd]
											FROM		RecebePgto
														INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
															ON Empresa = Empresa_rpg
															AND Banco = BancoDep_Rpg
															AND Conta = ContaDep_Rpg
											WHERE		DataDev_Rpg < '07/01/2026'
														AND Status_Rpg = 2
											GROUP BY	Empresa_Rpg, BancoDep_Rpg, ContaDep_Rpg
										) [RecebDev]
											ON Empresa_Banco = Empresa_Rpgd
											AND Numero_Banco = Banco_Rpgd
											AND Conta_Banco = Conta_Rpgd
										LEFT JOIN
										(
											SELECT		Empresa_Rpg,
														BancoDep_Rpg,
														ContaDep_Rpg,
														SUM
														(
															CASE WHEN Empresa_Doc IS NOT NULL
																THEN Valor_Rpg
																ELSE 0
															END
														) [Valor_Rpgc]
											FROM		RecebePgto
														LEFT JOIN Extrato
															ON BancoDep_Rpg = Banco_Doc
															AND Empresa_Rpg = Empresa_Doc
															AND ContaDep_Rpg = Conta_Doc
															AND NumDep_Rpg = Numero_Doc
															AND Tipo_Doc = 1
														INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
															ON Empresa = Empresa_rpg
															AND Banco = BancoDep_Rpg
															AND Conta = ContaDep_Rpg
											WHERE		Data_Doc < '07/01/2026'
											GROUP BY	Empresa_Rpg, BancoDep_Rpg, ContaDep_Rpg
										) [RecebConc]
											ON Empresa_Banco = Empresa_Rpg
											AND Numero_Banco = BancoDep_Rpg
											AND Conta_Banco = ContaDep_Rpg
										LEFT JOIN
										(
											SELECT		Empresa_Dep,
														Banco_Dep,
														Conta_Dep,
														SUM(Valor_Dep) [Valor_Rpg]
											FROM		Depositos
														INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
															ON Empresa = Empresa_dep
															AND Banco = Banco_Dep
															AND Conta = Conta_Dep
											WHERE		Data_Dep < '07/01/2026'
											GROUP BY	Empresa_Dep, Banco_Dep, Conta_Dep
										) [Receb]
											ON Empresa_Banco = Empresa_Dep
											AND Numero_Banco = Banco_Dep
											AND Conta_Banco = Conta_Dep
										INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
											ON Empresa = Empresa_banco
											AND Banco = Numero_banco
											AND Conta = Conta_banco
						) [SaldoAnterior]
							ON Empresa_Es = Empresa_Ant
							AND Banco_Es = Banco_Ant
							AND Conta_Es = Conta_Ant
						INNER JOIN Empresas
							ON Empresa_Es = Codigo_Emp
						INNER JOIN Bancos
							ON Banco_Es = Numero_Banco

			UNION

			/* Cheques não compensados */
			SELECT		Empresa_Chq [CodEmpresa],
						NumBank_Chq [NumBanco],
						Conta_Chq [NumConta],
						0 [SaldoNaoConcil_Ant],
						0 [SaldoConcil_Ant],
						Data_Chq [Data],
						UPPER(ISNULL(CAST(CodForn_Chq AS VARCHAR) + ' - ' + Nome_Pes, Nominal_Chq)) [Historico],
						UPPER(ISNULL(CAST(CodForn_Chq AS VARCHAR) + ' - ' + Nome_Pes, Nominal_Chq)) [HistoricoChq],
						'' [Lanct],
						Num_Chq [Cheque],
						0 [Credito],
						Valor_Chq [Debito],
						0 [SaldoNaoConcil_Per],
						0 [SaldoConcil_Per],
						CASE WHEN Data_Chq BETWEEN '07/01/2026' AND '01/01/2070'
							THEN 33
							ELSE -1
						END [TipoLanc],
						1 [ChequesNaoCompensados],
						CAST(Empresa_Chq AS VARCHAR) + '_' + CAST(NumBank_Chq AS VARCHAR) + '_' + Conta_Chq + '_' + Num_Chq [Chave],
						NULL [ChaveChequeEmitido],
						0 [VlrChqComp],
						0 [VlrChqEmitido],
						0 [ChequeAnterior]
			FROM		CheqEmissao
						LEFT JOIN Pessoas
							ON Cod_Pes = CodForn_Chq
						INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
							ON Empresa = Empresa_chq
							AND Banco = NumBank_Chq
							AND Conta = Conta_Chq
			WHERE		(
							DataComp_Chq IS NULL
							OR DataComp_Chq > '01/01/2070'
						)
						AND Data_Chq <= '01/01/2070'

			UNION

			/* Cheques não compensados de transferência bancária */
			SELECT		Empresa_Tb [CodEmpresa],
						BcoDeb_Tb [NumBanco],
						ContaDeb_Tb [NumConta],
						0 [SaldoNaoConcil_Ant],
						0 [SaldoConcil_Ant],
						Data_Tb [Data],
						UPPER(Obs_Tb) [Historico],
						UPPER(Obs_Tb) [HistoricoChq],
						'' [Lanct],
						NumDoc_Tb [Cheque],
						0 [Credito],
						Valor_Tb [Debito],
						0 [SaldoNaoConcil_Per],
						0 [SaldoConcil_Per],
						CASE WHEN Data_Tb BETWEEN '07/01/2026' AND '01/01/2070'
							THEN 33
							ELSE -1
						END [TipoLanc],
						1 [ChequesNaoCompensados],
						CAST(Empresa_Tb AS VARCHAR) + '_' + CAST(BcoDeb_Tb AS VARCHAR) + '_' + ContaDeb_Tb + '_' + NumDoc_Tb [Chave],
						NULL [ChaveChequeEmitido],
						0 [VlrChqComp],
						0 [VlrChqEmitido],
						0 [ChequeAnterior]
			FROM		VwTransfBcoExtrato
						INNER JOIN fn_ListEmpBancoConta('4|1/10744-G,4|1/10744-X,4|1/10745-G,4|1/10745-X,4|341/99458-7,4|341/99302-7,4|341/99678-0,4|341/99718-4,4|341/99754-9,4|422/581508-1,4|422/581506-4,4|756/127859-2,4|756/127859-G,4|104/580256669-4,4|33/13003997-7',',')
							ON Empresa = Empresa_tb
							AND Banco = BcoDeb_tb
							AND Conta = ContaDeb_tb
			WHERE		Tipo_Tb = 1
						AND
						(
							DataConcilDebito_Doc IS NULL
							OR DataConcilDebito_Doc > '01/01/2070'
						)
						AND Data_Tb <= '01/01/2070'
) [Resultado]
			INNER JOIN Empresas
				ON CodEmpresa = Codigo_Emp
			INNER JOIN Bancos
				ON NumBanco = Numero_Banco
ORDER BY	CodEmpresa, ChequesNaoCompensados, NumBanco, NumConta, Data, Lanct, Cheque
