'use client'

import { useMemo, useState } from 'react'
import {
    BarChart3, Scissors, Building2, CalendarRange, Lightbulb,
    Target, Flame, Snowflake, AlertTriangle,
} from 'lucide-react'

/* ────────────────────────── Tipos ────────────────────────── */

export type TipoCusto = 'fixo' | 'variavel' | 'nao_classificado'

export interface ItemCusto {
    insumo: string
    tipo: TipoCusto
    valor: number
    pct: number      // participação no custo total do período
    pctAcum: number  // acumulado (para a curva ABC)
    classe: 'A' | 'B' | 'C'
}

export interface MesSerie {
    ym: string
    mc: number
    fixo: number
    variavel: number
    naoClass: number
}

interface Props {
    itens: ItemCusto[]
    fornecedores: { cliente: string; valor: number }[]
    serie: MesSerie[]
    custoFixo: number
    custoVariavel: number
    naoClassificado: number
    custosTotais: number
    resultado: number
    recebidoTotal: number
    pctEquilibrio: number
}

/* ────────────────────────── Helpers ────────────────────────── */

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const pctFmt = (v: number) => `${((v || 0) * 100).toFixed(1).replace('.', ',')}%`

const COR: Record<TipoCusto, string> = {
    fixo: '#f59e0b',
    variavel: '#38bdf8',
    nao_classificado: '#fb923c',
}
const ROTULO: Record<TipoCusto, string> = {
    fixo: 'Fixo',
    variavel: 'Variável',
    nao_classificado: 'A classificar',
}
const COR_CLASSE: Record<'A' | 'B' | 'C', string> = { A: '#F97316', B: '#EAB308', C: '#64748B' }

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const labelMes = (ym: string) => `${MES_ABREV[Number(ym.slice(5, 7)) - 1] ?? ym.slice(5, 7)}/${ym.slice(2, 4)}`

/* Faixa de referência de mercado para overhead/estrutura na construção civil
   (CFMA / benchmarks de construtoras): 8% a 15% da receita. */
const BENCH_MIN = 8
const BENCH_MAX = 15

/* ────────────────────────── Componente ────────────────────────── */

export default function DreSedeRelatorio({
    itens, fornecedores, serie, custoFixo, custoVariavel,
    naoClassificado, custosTotais, resultado, recebidoTotal, pctEquilibrio,
}: Props) {
    const meses = Math.max(serie.length, 1)
    const gap = resultado < 0 ? -resultado : 0

    const topVariavel = useMemo(() => itens.find(i => i.tipo === 'variavel'), [itens])
    const topFixo = useMemo(() => itens.find(i => i.tipo === 'fixo'), [itens])
    const classeA = useMemo(() => itens.filter(i => i.classe === 'A'), [itens])

    /* Simulador de corte: seleção começa nos 3 maiores e passa a ser manual após o 1º clique */
    const [selManual, setSelManual] = useState<Set<string> | null>(null)
    const [pctCorte, setPctCorte] = useState(20)
    const chaveSel = useMemo(
        () => selManual ?? new Set(itens.slice(0, 3).map(i => i.insumo.toUpperCase())),
        [selManual, itens],
    )
    const alvos = useMemo(() => itens.slice(0, 12), [itens])
    const baseSelecionada = useMemo(
        () => alvos.filter(i => chaveSel.has(i.insumo.toUpperCase())).reduce((s, i) => s + i.valor, 0),
        [alvos, chaveSel],
    )
    const economia = baseSelecionada * (pctCorte / 100)
    const novoResultado = resultado + economia
    const novoPctEquilibrio = recebidoTotal > 0 ? ((custosTotais - economia) / recebidoTotal) * 100 : 0
    const coberturaGap = gap > 0 ? Math.min(economia / gap, 1) : 1

    function alternar(insumo: string) {
        const k = insumo.toUpperCase()
        const novo = new Set(chaveSel)
        if (novo.has(k)) novo.delete(k); else novo.add(k)
        setSelManual(novo)
    }

    /* Recomendações geradas a partir dos números do período */
    const recomendacoes = useMemo(() => {
        const r: { cor: string; texto: string }[] = []

        if (gap > 0) {
            const pctCorteNecessario = custosTotais > 0 ? (gap / custosTotais) * 100 : 0
            const receitaExtra = gap / 0.06
            r.push({
                cor: '#ef4444',
                texto: `Faltam ${fmt(gap)} para a sede se pagar. Isso equivale a cortar ${pctCorteNecessario.toFixed(1).replace('.', ',')}% dos custos da estrutura ou a faturar mais ${fmt(receitaExtra)} nas obras (à margem de 6%).`,
            })
        } else {
            const folga = custosTotais > 0 ? (resultado / custosTotais) * 100 : 0
            r.push({
                cor: '#10b981',
                texto: `A sede se pagou com folga de ${fmt(resultado)} — margem de segurança de ${folga.toFixed(1).replace('.', ',')}% sobre os custos. Dá para absorver esse tanto de queda na receita antes de entrar no vermelho.`,
            })
        }

        if (classeA.length > 0) {
            r.push({
                cor: '#F97316',
                texto: `${classeA.length} ${classeA.length === 1 ? 'item concentra' : 'itens concentram'} 80% de todo o gasto da sede (de ${itens.length} itens no total). Negociação fora dessa lista quase não muda o resultado.`,
            })
        }

        if (topFixo) {
            const mensal = topFixo.valor / meses
            r.push({
                cor: COR.fixo,
                texto: `"${topFixo.insumo}" é o maior custo fixo: ${fmt(topFixo.valor)} no período (${pctFmt(topFixo.valor / (custoFixo || 1))} dos fixos, ~${fmt(mensal)}/mês). Por ser fixo, cada 10% renegociado economiza ~${fmt(mensal * 0.1)} todo mês, de forma recorrente — é o corte de maior efeito composto.`,
            })
        }
        if (topVariavel) {
            r.push({
                cor: COR.variavel,
                texto: `"${topVariavel.insumo}" é o maior custo variável: ${fmt(topVariavel.valor)} (${pctFmt(topVariavel.valor / (custoVariavel || 1))} dos variáveis). Variável acompanha o volume — compare o crescimento dele com o do Recebido Real antes de cortar.`,
            })
        }

        const topForn = fornecedores[0]
        if (topForn && custosTotais > 0 && topForn.valor / custosTotais >= 0.15) {
            r.push({
                cor: '#a78bfa',
                texto: `"${topForn.cliente}" concentra ${pctFmt(topForn.valor / custosTotais)} do gasto da sede (${fmt(topForn.valor)}). Volume nesse tamanho é poder de barganha: vale abrir renegociação de contrato ou cotar alternativa.`,
            })
        }

        if (pctEquilibrio > 0) {
            const dentro = pctEquilibrio >= BENCH_MIN && pctEquilibrio <= BENCH_MAX
            const abaixo = pctEquilibrio < BENCH_MIN
            r.push({
                cor: abaixo ? '#10b981' : dentro ? '#eab308' : '#ef4444',
                texto: abaixo
                    ? `A estrutura da sede consome ${pctEquilibrio.toFixed(2).replace('.', ',')}% da receita das obras — abaixo da faixa de ${BENCH_MIN}–${BENCH_MAX}% típica de construtoras. A estrutura não está inchada; o aperto vem da margem de 6% ser baixa para o porte da operação. Rever a margem cobrada nas obras tende a resolver mais que cortar custo.`
                    : dentro
                        ? `A estrutura consome ${pctEquilibrio.toFixed(2).replace('.', ',')}% da receita das obras — dentro da faixa de mercado (${BENCH_MIN}–${BENCH_MAX}%), mas acima dos 6% cobrados. Ou a margem sobe, ou a estrutura precisa encolher.`
                        : `A estrutura consome ${pctEquilibrio.toFixed(2).replace('.', ',')}% da receita das obras — acima da faixa de ${BENCH_MIN}–${BENCH_MAX}% de mercado. Sinal de estrutura pesada para o volume atual: ou cresce o faturamento, ou reduz a estrutura.`,
            })
        }

        if (naoClassificado > 0) {
            r.push({
                cor: '#fb923c',
                texto: `${fmt(naoClassificado)} ainda estão sem classificação e estão abatendo do resultado sem entrar em fixo nem variável. Classifique-os no DRE acima para o diagnóstico ficar confiável.`,
            })
        }

        return r
    }, [gap, custosTotais, resultado, classeA, itens.length, topFixo, topVariavel, meses,
        custoFixo, custoVariavel, fornecedores, pctEquilibrio, naoClassificado])

    if (itens.length === 0) {
        return (
            <div className="glass-card" style={{ padding: '28px', marginTop: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                Sem custos lançados no período — o relatório gerencial aparece quando houver movimento.
            </div>
        )
    }

    /* ── estilos ── */
    const secao: React.CSSProperties = { marginTop: '24px' }
    const secaoHead: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '9px',
        padding: '16px 20px', borderBottom: '1px solid var(--border-glass)',
    }
    const secaoTitulo: React.CSSProperties = { fontSize: '15px', fontWeight: 700 }
    const secaoSub: React.CSSProperties = { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }
    const th: React.CSSProperties = {
        textAlign: 'left', padding: '9px 20px', fontSize: '11px', textTransform: 'uppercase',
        letterSpacing: '0.5px', color: 'var(--text-muted)', position: 'sticky', top: 0, background: '#131328', zIndex: 1,
    }
    const td: React.CSSProperties = { padding: '8px 20px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)' }
    const elipse: React.CSSProperties = { maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

    const badgeTipo = (t: TipoCusto) => (
        <span style={{
            fontSize: '10px', fontWeight: 700, color: COR[t], background: `${COR[t]}1f`,
            padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap',
        }}>{ROTULO[t]}</span>
    )

    const card = (cor: string, titulo: string, icone: React.ReactNode, valor: string, destaque?: string, hint?: string) => (
        <div className="glass-card" style={{ padding: '16px 18px', borderLeft: `3px solid ${cor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {icone}{titulo}
            </div>
            <div style={{ fontSize: '21px', fontWeight: 800, color: cor, marginTop: '8px', whiteSpace: 'nowrap' }}>{valor}</div>
            {destaque && (
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '5px', ...elipse, maxWidth: '100%' }} title={destaque}>{destaque}</div>
            )}
            {hint && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</div>}
        </div>
    )

    const maxSerie = Math.max(1, ...serie.map(s => Math.max(s.mc, s.fixo + s.variavel + s.naoClass)))

    return (
        <div style={{ marginTop: '32px' }}>
            <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Lightbulb size={19} color="#eab308" />
                <h2 style={{ fontSize: '19px', fontWeight: 800 }}>Relatório gerencial — onde agir</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Leitura do período pelos números acima: os maiores ofensores, o que muda o resultado se for cortado e o que só faz barulho.
            </p>

            {/* ── Cards de diagnóstico ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: '14px' }}>
                {card(
                    COR.variavel, 'Maior custo variável', <Flame size={13} />,
                    topVariavel ? fmt(topVariavel.valor) : '—',
                    topVariavel?.insumo,
                    topVariavel ? `${pctFmt(topVariavel.valor / (custoVariavel || 1))} dos variáveis · ~${fmt(topVariavel.valor / meses)}/mês` : 'Nenhum custo variável no período',
                )}
                {card(
                    COR.fixo, 'Maior custo fixo', <Snowflake size={13} />,
                    topFixo ? fmt(topFixo.valor) : '—',
                    topFixo?.insumo,
                    topFixo ? `${pctFmt(topFixo.valor / (custoFixo || 1))} dos fixos · ~${fmt(topFixo.valor / meses)}/mês` : 'Nenhum custo fixo no período',
                )}
                {card(
                    gap > 0 ? '#ef4444' : '#10b981',
                    gap > 0 ? 'Falta para se pagar' : 'Folga do período', <Target size={13} />,
                    fmt(gap > 0 ? gap : resultado),
                    gap > 0
                        ? `Cortar ${((gap / (custosTotais || 1)) * 100).toFixed(1).replace('.', ',')}% dos custos`
                        : `Margem de segurança de ${((resultado / (custosTotais || 1)) * 100).toFixed(1).replace('.', ',')}%`,
                    gap > 0
                        ? `ou faturar + ${fmt(gap / 0.06)} em obras (a 6%)`
                        : `equivale a ${fmt(resultado / 0.06)} de receita de obra`,
                )}
                {card(
                    '#a78bfa', 'Queima mensal da sede', <CalendarRange size={13} />,
                    `${fmt(custosTotais / meses)}/mês`,
                    `Fixo ~${fmt(custoFixo / meses)}/mês`,
                    `Precisa de ${fmt(custosTotais / meses / 0.06)}/mês de obra faturada para se sustentar`,
                )}
            </div>

            {/* ── Curva ABC ── */}
            <div className="glass-card" style={{ ...secao, padding: 0, overflow: 'hidden' }}>
                <div style={secaoHead}>
                    <BarChart3 size={17} color="#F97316" />
                    <div>
                        <div style={secaoTitulo}>Onde está o dinheiro · Curva ABC dos custos</div>
                        <div style={secaoSub}>
                            {classeA.length} de {itens.length} itens (classe A) concentram 80% do gasto — {fmt(classeA.reduce((s, i) => s + i.valor, 0))}. Priorize esses.
                        </div>
                    </div>
                </div>
                <div style={{ maxHeight: '380px', overflowY: 'auto', background: 'rgba(0,0,0,0.18)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, width: '42px', textAlign: 'center' }}>#</th>
                                <th style={th}>Item</th>
                                <th style={{ ...th, width: '110px' }}>Tipo</th>
                                <th style={{ ...th, textAlign: 'right', width: '140px' }}>Gasto</th>
                                <th style={{ ...th, width: '190px' }}>Participação</th>
                                <th style={{ ...th, textAlign: 'right', width: '90px' }}>Acum.</th>
                                <th style={{ ...th, textAlign: 'center', width: '70px' }}>Classe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itens.map((it, i) => (
                                <tr key={it.insumo}>
                                    <td style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{i + 1}</td>
                                    <td style={{ ...td, ...elipse }} title={it.insumo}>{it.insumo}</td>
                                    <td style={td}>{badgeTipo(it.tipo)}</td>
                                    <td style={{ ...td, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(it.valor)}</td>
                                    <td style={td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ flex: 1, height: '7px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.max(it.pct * 100, 1.5)}%`, height: '100%', background: COR[it.tipo], borderRadius: '4px' }} />
                                            </div>
                                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', width: '46px', textAlign: 'right' }}>{pctFmt(it.pct)}</span>
                                        </div>
                                    </td>
                                    <td style={{ ...td, textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>{pctFmt(it.pctAcum)}</td>
                                    <td style={{ ...td, textAlign: 'center' }}>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 800, color: COR_CLASSE[it.classe],
                                            background: `${COR_CLASSE[it.classe]}22`, padding: '2px 9px', borderRadius: '10px',
                                        }}>{it.classe}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Simulador de corte ── */}
            <div className="glass-card" style={{ ...secao, padding: 0, overflow: 'hidden' }}>
                <div style={secaoHead}>
                    <Scissors size={17} color="#10b981" />
                    <div>
                        <div style={secaoTitulo}>Simulador de corte · e se a gente cortar?</div>
                        <div style={secaoSub}>Marque os itens que dá para negociar e ajuste o percentual — o resultado da sede é recalculado na hora.</div>
                    </div>
                </div>

                <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
                    <div style={{ flex: '1 1 260px', minWidth: '240px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            <span>Corte aplicado nos itens marcados</span>
                            <strong style={{ color: '#10b981', fontSize: '14px' }}>{pctCorte}%</strong>
                        </div>
                        <input
                            type="range" min={5} max={50} step={5} value={pctCorte}
                            onChange={e => setPctCorte(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#10b981' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '26px', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Economia</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>{fmt(economia)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>~{fmt(economia / meses)}/mês</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Novo resultado</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: novoResultado >= 0 ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>{fmt(novoResultado)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>equilíbrio cai para {novoPctEquilibrio.toFixed(2).replace('.', ',')}%</div>
                        </div>
                    </div>
                </div>

                {gap > 0 && (
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {novoResultado >= 0
                                    ? `✅ Esse corte fecha o buraco de ${fmt(gap)} e ainda sobra ${fmt(novoResultado)}.`
                                    : `Cobre ${pctFmt(coberturaGap)} do que falta — ainda ficariam ${fmt(-novoResultado)} descobertos.`}
                            </span>
                            <strong style={{ color: novoResultado >= 0 ? '#10b981' : '#f59e0b' }}>{pctFmt(coberturaGap)}</strong>
                        </div>
                        <div style={{ height: '9px', background: 'rgba(255,255,255,0.07)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ width: `${coberturaGap * 100}%`, height: '100%', background: novoResultado >= 0 ? '#10b981' : '#f59e0b', borderRadius: '5px', transition: 'width .2s' }} />
                        </div>
                    </div>
                )}

                <div style={{ maxHeight: '330px', overflowY: 'auto', background: 'rgba(0,0,0,0.18)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, width: '46px', textAlign: 'center' }}>Cortar</th>
                                <th style={th}>Item</th>
                                <th style={{ ...th, width: '110px' }}>Tipo</th>
                                <th style={{ ...th, textAlign: 'right', width: '140px' }}>Gasto no período</th>
                                <th style={{ ...th, textAlign: 'right', width: '120px' }}>Por mês</th>
                                <th style={{ ...th, textAlign: 'right', width: '150px' }}>Economia −{pctCorte}%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alvos.map(it => {
                                const marcado = chaveSel.has(it.insumo.toUpperCase())
                                return (
                                    <tr
                                        key={it.insumo}
                                        onClick={() => alternar(it.insumo)}
                                        style={{ cursor: 'pointer', background: marcado ? 'rgba(16,185,129,0.07)' : undefined }}
                                    >
                                        <td style={{ ...td, textAlign: 'center' }}>
                                            <input
                                                type="checkbox" checked={marcado} readOnly
                                                style={{ accentColor: '#10b981', cursor: 'pointer', width: '15px', height: '15px' }}
                                            />
                                        </td>
                                        <td style={{ ...td, ...elipse }} title={it.insumo}>{it.insumo}</td>
                                        <td style={td}>{badgeTipo(it.tipo)}</td>
                                        <td style={{ ...td, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(it.valor)}</td>
                                        <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmt(it.valor / meses)}</td>
                                        <td style={{ ...td, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: marcado ? '#10b981' : 'var(--text-muted)' }}>
                                            {marcado ? fmt(it.valor * (pctCorte / 100)) : '—'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Fornecedores + Tendência ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px', marginTop: '24px' }}>
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={secaoHead}>
                        <Building2 size={17} color="#a78bfa" />
                        <div>
                            <div style={secaoTitulo}>Concentração por fornecedor</div>
                            <div style={secaoSub}>Volume concentrado = poder de negociação</div>
                        </div>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.18)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={th}>Fornecedor</th>
                                    <th style={{ ...th, textAlign: 'right', width: '135px' }}>Pago</th>
                                    <th style={{ ...th, textAlign: 'right', width: '75px' }}>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fornecedores.slice(0, 15).map(f => (
                                    <tr key={f.cliente}>
                                        <td style={{ ...td, ...elipse, maxWidth: '240px' }} title={f.cliente}>{f.cliente}</td>
                                        <td style={{ ...td, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(f.valor)}</td>
                                        <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)' }}>{pctFmt(f.valor / (custosTotais || 1))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={secaoHead}>
                        <CalendarRange size={17} color="#38bdf8" />
                        <div>
                            <div style={secaoTitulo}>Tendência mensal</div>
                            <div style={secaoSub}>Margem das obras × custo da sede, mês a mês</div>
                        </div>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.18)', padding: '14px 20px' }}>
                        {serie.length === 0 ? (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem movimento no período.</div>
                        ) : serie.map(s => {
                            const custo = s.fixo + s.variavel + s.naoClass
                            const res = s.mc - custo
                            return (
                                <div key={s.ym} style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                                        <strong style={{ textTransform: 'capitalize' }}>{labelMes(s.ym)}</strong>
                                        <span style={{ color: res >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{fmt(res)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '58px' }}>Margem 6%</span>
                                        <div style={{ flex: 1, height: '9px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                            <div style={{ width: `${(s.mc / maxSerie) * 100}%`, height: '100%', background: '#10b981', borderRadius: '5px' }} />
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '110px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(s.mc)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '58px' }}>Custo sede</span>
                                        <div style={{ flex: 1, height: '9px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                                            <div style={{ width: `${(s.fixo / maxSerie) * 100}%`, height: '100%', background: COR.fixo }} title={`Fixo ${fmt(s.fixo)}`} />
                                            <div style={{ width: `${(s.variavel / maxSerie) * 100}%`, height: '100%', background: COR.variavel }} title={`Variável ${fmt(s.variavel)}`} />
                                            <div style={{ width: `${(s.naoClass / maxSerie) * 100}%`, height: '100%', background: COR.nao_classificado }} title={`A classificar ${fmt(s.naoClass)}`} />
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '110px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(custo)}</span>
                                    </div>
                                </div>
                            )
                        })}
                        <div style={{ display: 'flex', gap: '14px', fontSize: '10.5px', color: 'var(--text-muted)', paddingTop: '4px' }}>
                            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: COR.fixo, borderRadius: 2, marginRight: 5 }} />Fixo</span>
                            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: COR.variavel, borderRadius: 2, marginRight: 5 }} />Variável</span>
                            {naoClassificado > 0 && <span><span style={{ display: 'inline-block', width: 8, height: 8, background: COR.nao_classificado, borderRadius: 2, marginRight: 5 }} />A classificar</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Leitura do período ── */}
            <div className="glass-card" style={{ ...secao, padding: 0, overflow: 'hidden' }}>
                <div style={secaoHead}>
                    <Lightbulb size={17} color="#eab308" />
                    <div>
                        <div style={secaoTitulo}>Leitura do período · o que fazer com isso</div>
                        <div style={secaoSub}>Conclusões geradas a partir dos números acima</div>
                    </div>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
                    {recomendacoes.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: r.cor, marginTop: '7px', flexShrink: 0 }} />
                            <span style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{r.texto}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '2px' }}>
                        <AlertTriangle size={14} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ fontSize: '11.5px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                            Regime de caixa (só o que foi pago) e empréstimos/juros fora da conta. Curva ABC pelo princípio de Pareto (classe A = 80% do gasto, B = até 95%, C = o restante).
                            Faixa de {BENCH_MIN}–{BENCH_MAX}% é a referência de mercado para estrutura/overhead em construtoras.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
