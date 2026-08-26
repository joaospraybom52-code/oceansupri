'use client'

import { useMemo, useState } from 'react'
import { BarChart3, ChevronDown, ChevronRight, AlertTriangle, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import MultiSelect from '@/components/ui/MultiSelect'
import {
    ehEstrutura, ehDiretoria, ehCaptacao, ehSede, ehCartao, palpitarTipo, brl,
    ROTULO_TIPO, type TipoClassificacao,
    ROTULO_LINHA, LINHAS_SELECIONAVEIS, chaveRegra, chaveSeg, linhaManual, escopoRegra,
    type LinhaDre, type RegraLinha,
} from '@/lib/utils/dre-gerencial'
import type { MovRow } from '@/app/controle/dre-gerencial/page'

interface Classif { nominal: string; tipo: TipoClassificacao }

const MESES_FILTRO = [
    { v: '01', n: 'Janeiro' }, { v: '02', n: 'Fevereiro' }, { v: '03', n: 'Março' },
    { v: '04', n: 'Abril' }, { v: '05', n: 'Maio' }, { v: '06', n: 'Junho' },
    { v: '07', n: 'Julho' }, { v: '08', n: 'Agosto' }, { v: '09', n: 'Setembro' },
    { v: '10', n: 'Outubro' }, { v: '11', n: 'Novembro' }, { v: '12', n: 'Dezembro' },
]

/** Filtro de período pela coluna VENCIMENTO (regra do usuário). */
const matchPeriodo = (venc: string | null, anos: string[], meses: string[]) => {
    if (!venc) return false
    if (anos.length && !anos.includes(venc.slice(0, 4))) return false
    if (meses.length && !meses.includes(venc.slice(5, 7))) return false
    return true
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/* ── estilos ── */
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', position: 'sticky', top: 0, background: '#131328', zIndex: 2 }
const td: React.CSSProperties = { padding: '7px 20px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)' }
const drillWrap: React.CSSProperties = { maxHeight: '360px', overflowY: 'auto', background: 'rgba(0,0,0,0.18)' }
const inputFiltro: React.CSSProperties = {
    width: '100%', padding: '5px 9px', fontSize: '12px', fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)',
    borderRadius: '6px', color: 'inherit', outline: 'none',
}

/** Linhas da DRE que têm drill. */
type LinhaId = 'receita' | 'custo' | 'cartao' | 'estrutura' | 'diretoria' | 'financeiro'

/** Alcance da regra manual escolhido na hora de classificar. */
type Escopo = 'lancamento' | 'despesa' | 'obra'
const ROTULO_ESCOPO: Record<Escopo, string> = {
    lancamento: 'só este lançamento',
    despesa: 'toda esta despesa da obra',
    obra: 'a obra inteira',
}

export default function DreGerencialClient({
    movimentos, classificacao, regras, podeEditar,
}: {
    movimentos: MovRow[]
    classificacao: Classif[]
    regras: RegraLinha[]
    podeEditar: boolean
}) {
    const supabase = createClient()
    const [filtroAnos, setFiltroAnos] = useState<string[]>([])
    const [filtroMeses, setFiltroMeses] = useState<string[]>([])
    const [filtroObras, setFiltroObras] = useState<string[]>([])
    const [aberta, setAberta] = useState<LinhaId | null>(null)
    const [busca, setBusca] = useState('')
    const [classes, setClasses] = useState<Classif[]>(classificacao)
    const [salvando, setSalvando] = useState('')
    const [regrasManuais, setRegrasManuais] = useState<RegraLinha[]>(regras)
    const [escopos, setEscopos] = useState<Record<string, Escopo>>({})

    /** Regras manuais indexadas pela chave obra|despesa|nominal ('' = coringa). */
    const mapaRegras = useMemo(() => {
        const m = new Map<string, LinhaDre>()
        regrasManuais.forEach(r => m.set(chaveRegra(r.obra, r.descr_comp, r.nominal), r.linha))
        return m
    }, [regrasManuais])

    const mapaClasse = useMemo(() => {
        const m = new Map<string, TipoClassificacao>()
        classes.forEach(c => m.set((c.nominal || '').toUpperCase(), c.tipo))
        return m
    }, [classes])

    /** Tipo efetivo: o que o usuário salvou; senão o palpite automático. */
    const tipoDe = (nominal: string | null, valor: number): TipoClassificacao =>
        mapaClasse.get((nominal || '').toUpperCase()) ?? palpitarTipo(nominal, valor)

    const anosDisponiveis = useMemo(() => {
        const s = new Set<string>()
        movimentos.forEach(m => { if (m.vencimento) s.add(m.vencimento.slice(0, 4)) })
        return Array.from(s).sort()
    }, [movimentos])

    const obrasDisponiveis = useMemo(() => {
        const m = new Map<string, string>()
        movimentos.forEach(x => {
            const cod = (x.obra || '').trim()
            if (cod && !m.has(cod)) m.set(cod, x.desc_obra ? `${cod} — ${x.desc_obra}` : cod)
        })
        return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
            .map(([v, label]) => ({ value: v, label }))
    }, [movimentos])

    // Movimentos no filtro (período por vencimento + obra)
    const filtrados = useMemo(() => movimentos.filter(m =>
        matchPeriodo(m.vencimento, filtroAnos, filtroMeses)
        && (filtroObras.length === 0 || filtroObras.includes((m.obra || '').trim())),
    ), [movimentos, filtroAnos, filtroMeses, filtroObras])

    // ── Recorte de cada linha da DRE
    const grupos = useMemo(() => {
        const receita: MovRow[] = []
        const custo: MovRow[] = []
        const cartao: MovRow[] = []
        const estrutura: MovRow[] = []
        const diretoria: MovRow[] = []
        const financeiro: MovRow[] = []
        const emprestimo: MovRow[] = []
        const entreContas: MovRow[] = []
        const aClassificar: MovRow[] = []

        const balde: Record<LinhaDre, MovRow[]> = {
            receita, custo, cartao, estrutura, diretoria, financeiro,
            emprestimo, entre_contas: entreContas, ignorado: [],
        }

        for (const m of filtrados) {
            const v = Number(m.valor || 0)

            // Linha pela regra automática (obra + origem)
            let auto: LinhaDre | null = null
            switch (m.origem) {
                case 'RECEBIDAS':
                    auto = 'receita'; break
                case 'CONTAS PAGAS':
                    // SD005 = empréstimo bancário: fora do resultado, vai p/ captação
                    auto = ehCaptacao(m.obra) ? 'emprestimo'
                        : ehEstrutura(m.obra) ? 'estrutura'
                            : ehDiretoria(m.obra) ? 'diretoria' : 'custo'
                    break
                case 'TRANSFERÊNCIA':
                    auto = ehCartao(m.nominal) ? 'cartao' : 'entre_contas'; break
                case 'CONTROLE FINANCEIRO': {
                    if (!ehSede(m.obra)) { auto = ehDiretoria(m.obra) ? 'diretoria' : 'custo'; break }
                    const t = tipoDe(m.nominal, v)
                    auto = t === 'rendimento' || t === 'financeiro' ? 'financeiro'
                        : t === 'emprestimo' ? 'emprestimo' : 'ignorado'
                    break
                }
            }
            if (!auto) continue

            // A classificação manual do usuário vence a automática.
            const manual = linhaManual(mapaRegras, m.obra, m.descr_comp, m.nominal)
            balde[manual ?? auto].push(m)

            // O aviso de "classificação automática" só vale para o que ainda
            // depende do palpite — quem já foi classificado à mão sai da conta.
            if (!manual && m.origem === 'CONTROLE FINANCEIRO' && ehSede(m.obra)
                && !mapaClasse.has((m.nominal || '').toUpperCase())) aClassificar.push(m)
        }
        return { receita, custo, cartao, estrutura, diretoria, financeiro, emprestimo, entreContas, aClassificar }
    }, [filtrados, mapaClasse, mapaRegras])

    const soma = (rows: MovRow[]) => rows.reduce((s, r) => s + Number(r.valor || 0), 0)

    // ── Linhas da DRE (valores já com sinal: saídas negativas)
    const vReceita = soma(grupos.receita)
    const vCusto = soma(grupos.custo)
    const margem = vReceita + vCusto
    const vCartao = soma(grupos.cartao)
    const vEstrutura = soma(grupos.estrutura)
    const vDiretoria = soma(grupos.diretoria)
    const ebitda = margem + vCartao + vEstrutura + vDiretoria
    const vFinanceiro = soma(grupos.financeiro)
    const resultado = ebitda + vFinanceiro

    const vEmprestimo = soma(grupos.emprestimo)
    const vEntreContas = soma(grupos.entreContas)

    const dadosDrill: Record<LinhaId, MovRow[]> = {
        receita: grupos.receita, custo: grupos.custo, cartao: grupos.cartao,
        estrutura: grupos.estrutura, diretoria: grupos.diretoria, financeiro: grupos.financeiro,
    }

    async function classificar(nominal: string, tipo: TipoClassificacao) {
        if (!podeEditar) return
        const chave = nominal.toUpperCase()
        setSalvando(chave)
        const { error } = await supabase
            .from('dre_gerencial_classificacao' as any)
            .upsert({ nominal: chave, tipo, atualizado_em: new Date().toISOString() }, { onConflict: 'nominal' })
        if (error) toast.error('Erro ao classificar: ' + error.message)
        else {
            setClasses(prev => {
                const outros = prev.filter(c => (c.nominal || '').toUpperCase() !== chave)
                return [...outros, { nominal: chave, tipo }]
            })
            toast.success('Classificação salva!')
        }
        setSalvando('')
    }

    /**
     * Salva a linha escolhida à mão. O alcance decide o quanto a regra pega:
     * o lançamento, toda a despesa da obra, ou a obra inteira.
     */
    async function definirLinha(
        obra: string, descr: string, nominal: string, escopo: Escopo, linha: LinhaDre,
    ) {
        if (!podeEditar) return
        const reg: RegraLinha = {
            obra: chaveSeg(obra),
            descr_comp: escopo === 'obra' ? '' : chaveSeg(descr),
            nominal: escopo === 'lancamento' ? chaveSeg(nominal) : '',
            linha,
        }
        if (!reg.obra) { toast.error('Lançamento sem obra — não dá para classificar.'); return }

        const chave = chaveRegra(reg.obra, reg.descr_comp, reg.nominal)
        setSalvando(chave)
        const { error } = await supabase
            .from('dre_gerencial_linha' as any)
            .upsert({ ...reg, atualizado_em: new Date().toISOString() }, { onConflict: 'obra,descr_comp,nominal' })
        if (error) toast.error('Erro ao classificar: ' + error.message)
        else {
            setRegrasManuais(prev => [
                ...prev.filter(r => chaveRegra(r.obra, r.descr_comp, r.nominal) !== chave),
                reg,
            ])
            toast.success(`Movido para "${ROTULO_LINHA[linha]}" — ${ROTULO_ESCOPO[escopo]}.`)
        }
        setSalvando('')
    }

    /** Remove a regra e devolve o movimento para a linha automática. */
    async function removerRegra(r: RegraLinha) {
        if (!podeEditar) return
        const chave = chaveRegra(r.obra, r.descr_comp, r.nominal)
        setSalvando(chave)
        const { error } = await supabase
            .from('dre_gerencial_linha' as any)
            .delete().eq('obra', r.obra).eq('descr_comp', r.descr_comp).eq('nominal', r.nominal)
        if (error) toast.error('Erro ao remover: ' + error.message)
        else {
            setRegrasManuais(prev => prev.filter(x => chaveRegra(x.obra, x.descr_comp, x.nominal) !== chave))
            toast.success('Voltou para a classificação automática.')
        }
        setSalvando('')
    }

    const Linha = ({ id, rotulo, valor, hint, destaque, sinal }: {
        id?: LinhaId; rotulo: string; valor: number; hint?: string
        destaque?: 'total' | 'sub'; sinal?: boolean
    }) => {
        const clicavel = !!id
        const cor = destaque
            ? (valor >= 0 ? '#10b981' : '#ef4444')
            : (sinal ? '#ef4444' : 'var(--text-primary)')
        return (
            <>
                <div
                    onClick={() => clicavel && setAberta(aberta === id ? null : id!)}
                    style={{
                        display: 'grid', gridTemplateColumns: '26px 1fr auto', alignItems: 'center', gap: '12px',
                        padding: destaque ? '18px 20px' : '14px 20px', cursor: clicavel ? 'pointer' : 'default',
                        borderBottom: '1px solid var(--border-glass)',
                        background: destaque === 'total' ? 'rgba(16,185,129,0.06)' : destaque === 'sub' ? 'rgba(255,255,255,0.03)' : undefined,
                    }}
                >
                    <span style={{ color: 'var(--text-muted)' }}>
                        {clicavel ? (aberta === id ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : null}
                    </span>
                    <div>
                        <div style={{ fontWeight: destaque ? 800 : 600, fontSize: destaque ? '15px' : '14px' }}>{rotulo}</div>
                        {hint && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{hint}</div>}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: destaque ? '17px' : '15px', color: cor, whiteSpace: 'nowrap' }}>
                        {brl(valor)}
                    </div>
                </div>
                {clicavel && aberta === id && <Drill rows={dadosDrill[id!]} linha={id!} />}
            </>
        )
    }

    /** A regra manual que está pegando neste lançamento (ou null). */
    const regraAplicavel = (obra: string, descr: string, nominal: string): RegraLinha | null => {
        const candidatas = [
            { obra: chaveSeg(obra), descr_comp: chaveSeg(descr), nominal: chaveSeg(nominal) },
            { obra: chaveSeg(obra), descr_comp: chaveSeg(descr), nominal: '' },
            { obra: chaveSeg(obra), descr_comp: '', nominal: '' },
        ]
        for (const c of candidatas) {
            const linha = mapaRegras.get(chaveRegra(c.obra, c.descr_comp, c.nominal))
            if (linha) return { ...c, linha }
        }
        return null
    }

    /** Seletor da linha da DRE de um lançamento do drill. */
    const SeletorLinha = ({ l, linhaAtual }: {
        l: { obra: string; descr: string; nominal: string }; linhaAtual: LinhaId
    }) => {
        const chaveLocal = `${l.obra}|${l.descr}|${l.nominal}`
        const escopo = escopos[chaveLocal] ?? 'lancamento'
        const regra = regraAplicavel(l.obra, l.descr, l.nominal)
        const ocupado = salvando !== ''

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <select
                    value={regra?.linha ?? linhaAtual}
                    disabled={ocupado}
                    onChange={e => definirLinha(l.obra, l.descr, l.nominal, escopo, e.target.value as LinhaDre)}
                    className="select-field"
                    style={{ padding: '4px 8px', fontSize: '11px', width: '100%' }}
                >
                    {LINHAS_SELECIONAVEIS.map(v => (
                        <option key={v} value={v}>{ROTULO_LINHA[v]}</option>
                    ))}
                </select>

                {regra ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#f59e0b' }}>
                        <SlidersHorizontal size={11} />
                        <span title={escopoRegra(regra)}>
                            manual · {regra.nominal ? 'lançamento' : regra.descr_comp ? 'despesa' : 'obra'}
                        </span>
                        <button
                            type="button" onClick={() => removerRegra(regra)} disabled={ocupado}
                            title="Voltar para a classificação automática"
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                            <X size={11} />
                        </button>
                    </div>
                ) : (
                    <select
                        value={escopo}
                        onChange={e => setEscopos(prev => ({ ...prev, [chaveLocal]: e.target.value as Escopo }))}
                        className="select-field"
                        style={{ padding: '2px 6px', fontSize: '10px', width: '100%', color: 'var(--text-muted)' }}
                        title="A quê a classificação vai valer"
                    >
                        {(Object.keys(ROTULO_ESCOPO) as Escopo[]).map(v => (
                            <option key={v} value={v}>aplicar a: {ROTULO_ESCOPO[v]}</option>
                        ))}
                    </select>
                )}
            </div>
        )
    }

    const Drill = ({ rows, linha }: { rows: MovRow[]; linha: LinhaId }) => {
        const filtradas = rows.filter(r => {
            if (!busca.trim()) return true
            const q = norm(busca)
            return norm(`${r.obra ?? ''} ${r.descr_comp ?? ''} ${r.nominal ?? ''} ${r.fornecedor ?? ''}`).includes(q)
        })
        // agrupa por obra + despesa + nominal (o que o usuário pediu para ver).
        // Guarda os valores crus: é com eles que a regra manual é gravada.
        const agrupado = new Map<string, { obra: string; descr: string; nominal: string; valor: number; n: number }>()
        for (const r of filtradas) {
            const k = `${r.obra}|${r.descr_comp}|${r.nominal}`
            const cur = agrupado.get(k) ?? { obra: r.obra || '', descr: r.descr_comp || '', nominal: r.nominal || '', valor: 0, n: 0 }
            cur.valor += Number(r.valor || 0); cur.n++
            agrupado.set(k, cur)
        }
        const lista = Array.from(agrupado.values()).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))

        return (
            <div style={drillWrap}>
                <div style={{ padding: '10px 20px 0' }}>
                    <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar por obra, despesa, nominal ou fornecedor…" style={inputFiltro} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                    <thead>
                        <tr>
                            <th style={{ ...th, width: '110px' }}>Obra</th>
                            <th style={th}>Descr. Comp (despesa)</th>
                            <th style={th}>Nominal</th>
                            {linha === 'financeiro' && <th style={{ ...th, width: '190px' }}>Classificação</th>}
                            {podeEditar && <th style={{ ...th, width: '230px' }}>Linha da DRE</th>}
                            <th style={{ ...th, textAlign: 'right', width: '140px' }}>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lista.length === 0 && (
                            <tr><td style={{ ...td, color: 'var(--text-muted)' }} colSpan={6}>Nada no filtro.</td></tr>
                        )}
                        {lista.slice(0, 300).map((l, i) => (
                            <tr key={i}>
                                <td style={{ ...td, color: 'var(--accent-blue)', fontWeight: 600 }}>{l.obra || '—'}</td>
                                <td style={td}>{l.descr || '—'}</td>
                                <td style={{ ...td, color: 'var(--text-secondary)' }}>{l.nominal || '—'}</td>
                                {linha === 'financeiro' && (
                                    <td style={td}>
                                        <select
                                            value={tipoDe(l.nominal, l.valor)}
                                            disabled={!podeEditar || salvando === l.nominal.toUpperCase()}
                                            onChange={e => classificar(l.nominal, e.target.value as TipoClassificacao)}
                                            className="select-field" style={{ padding: '4px 8px', fontSize: '11px', width: '100%' }}
                                        >
                                            {(Object.keys(ROTULO_TIPO) as TipoClassificacao[]).map(t => (
                                                <option key={t} value={t}>{ROTULO_TIPO[t]}</option>
                                            ))}
                                        </select>
                                    </td>
                                )}
                                {podeEditar && (
                                    <td style={td}>
                                        <SeletorLinha l={l} linhaAtual={linha} />
                                    </td>
                                )}
                                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: l.valor < 0 ? '#ef4444' : '#10b981', whiteSpace: 'nowrap' }}>
                                    {brl(l.valor)}
                                </td>
                            </tr>
                        ))}
                        {lista.length > 300 && (
                            <tr><td style={{ ...td, color: 'var(--text-muted)' }} colSpan={6}>… e mais {lista.length - 300} linhas (refine o filtro).</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        )
    }

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart3 size={22} color="#10b981" /> DRE Gerencial
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Resultado por obra e da estrutura (origem: UAU · regime de caixa · período pelo vencimento).
                    Abra uma linha para ver o detalhe e mudar à mão em que linha cada custo entra.
                </p>
            </div>

            {/* Filtros */}
            {/* position/zIndex: o .glass-card cria contexto de empilhamento próprio,
                então sem isso o menu dos filtros fica atrás dos cards de baixo. */}
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '18px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', position: 'relative', zIndex: 30 }}>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Ano (vencimento)</label>
                    <MultiSelect options={anosDisponiveis.map(a => ({ value: a, label: a }))} selected={filtroAnos} onChange={setFiltroAnos} placeholder="Todos os anos" />
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Mês (vencimento)</label>
                    <MultiSelect options={MESES_FILTRO.map(m => ({ value: m.v, label: m.n }))} selected={filtroMeses} onChange={setFiltroMeses} placeholder="Todos os meses" />
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Obra</label>
                    <MultiSelect options={obrasDisponiveis} selected={filtroObras} onChange={setFiltroObras} placeholder="Todas as obras" minWidth={280} />
                </div>
                {(filtroAnos.length > 0 || filtroMeses.length > 0 || filtroObras.length > 0) && (
                    <button onClick={() => { setFiltroAnos([]); setFiltroMeses([]); setFiltroObras([]) }} className="btn-secondary" style={{ fontSize: '12px' }}>
                        Limpar filtros
                    </button>
                )}
            </div>

            {/* Aviso de itens não classificados */}
            {grupos.aClassificar.length > 0 && (
                <div className="glass-card" style={{ padding: '14px 18px', marginBottom: '18px', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangle size={18} color="#f59e0b" />
                    <span style={{ fontSize: '13px' }}>
                        <strong>{new Set(grupos.aClassificar.map(m => (m.nominal || '').toUpperCase())).size}</strong> descrições do controle financeiro
                        estão com a classificação <strong>automática</strong>. Abra a linha do Resultado Financeiro para revisar.
                    </span>
                </div>
            )}

            {/* DRE */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <Linha id="receita" rotulo="Receita por obra (medição)" hint="o que foi recebido no período" valor={vReceita} />
                <Linha id="custo" rotulo="(−) Custo direto da obra" hint="MO, material, equipamento, subempreiteiro" valor={vCusto} sinal />
                <Linha rotulo="= Margem de contribuição da obra" hint="o número do engenheiro/gerente" valor={margem} destaque="sub" />

                <Linha id="cartao" rotulo="(−) Cartões corporativos" hint="transferências para contas de cartão" valor={vCartao} sinal />
                <Linha id="estrutura" rotulo="(−) Despesas de estrutura" hint="sede, RH, fiscal, orçamento (ADMCO)" valor={vEstrutura} sinal />
                <Linha id="diretoria" rotulo="(−) Despesas diretoria" hint="obras DRT" valor={vDiretoria} sinal />
                <Linha rotulo="= EBITDA gerencial" hint="o número da diretoria" valor={ebitda} destaque="sub" />

                <Linha id="financeiro" rotulo="(−) Resultado financeiro" hint="juros, IOF, deságio, tarifas (−) e rendimentos (+)" valor={vFinanceiro} sinal />
                <Linha rotulo="= Resultado gerencial" valor={resultado} destaque="total" />
            </div>

            {/* Classificações manuais salvas */}
            {regrasManuais.length > 0 && (
                <div className="glass-card" style={{ padding: '18px 20px', marginTop: '18px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SlidersHorizontal size={15} color="#f59e0b" />
                        Classificações manuais ({regrasManuais.length})
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                        Estes lançamentos foram mandados para outra linha à mão — a regra automática não vale para eles.
                        A regra mais específica ganha: lançamento &gt; despesa &gt; obra.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {[...regrasManuais]
                            .sort((a, b) => escopoRegra(a).localeCompare(escopoRegra(b)))
                            .map(r => (
                                <div key={chaveRegra(r.obra, r.descr_comp, r.nominal)} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px',
                                    padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                                }}>
                                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{escopoRegra(r)}</span>
                                    <span style={{ fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>→ {ROTULO_LINHA[r.linha]}</span>
                                    {podeEditar && (
                                        <button
                                            type="button" onClick={() => removerRegra(r)} disabled={salvando !== ''}
                                            title="Voltar para a classificação automática"
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Bloco informativo */}
            <div className="glass-card" style={{ padding: '18px 20px', marginTop: '18px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Movimentações não operacionais</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Não entram no resultado — são captação e dinheiro trocando de conta.
                </p>
                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Empréstimos / captação</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#22d3ee', marginTop: '4px' }}>{brl(vEmprestimo)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transferências entre contas</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '4px' }}>{brl(vEntreContas)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{grupos.entreContas.length} lançamentos (só o total)</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
