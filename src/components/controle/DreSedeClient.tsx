'use client'

import { useMemo, useState } from 'react'
import { Landmark, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import MultiSelect from '@/components/ui/MultiSelect'

interface RecebidoObraMes { obra: string; ym: string; valor: number }
interface CustoRow { descrinsumo: string | null; cliente: string | null; data_movimento: string | null; vlr_at_pago: number | null }
interface Classif { insumo: string; tipo: 'fixo' | 'variavel' | 'ignorado' }
interface ObraRef { codigo: string | null; nome: string }

type Tipo = 'fixo' | 'variavel' | 'ignorado' | 'nao_classificado'

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const MESES_FILTRO = [
    { v: '01', n: 'Janeiro' }, { v: '02', n: 'Fevereiro' }, { v: '03', n: 'Março' },
    { v: '04', n: 'Abril' }, { v: '05', n: 'Maio' }, { v: '06', n: 'Junho' },
    { v: '07', n: 'Julho' }, { v: '08', n: 'Agosto' }, { v: '09', n: 'Setembro' },
    { v: '10', n: 'Outubro' }, { v: '11', n: 'Novembro' }, { v: '12', n: 'Dezembro' },
]

const matchPeriodo = (ym: string, anos: string[], meses: string[]) => {
    if (!ym) return false
    if (anos.length && !anos.includes(ym.slice(0, 4))) return false
    if (meses.length && !meses.includes(ym.slice(5, 7))) return false
    return true
}

const TIPO_LABEL: Record<string, string> = { fixo: 'Fixo', variavel: 'Variável', ignorado: 'Ignorado' }

export default function DreSedeClient({ recebido, custos, classificacao, obras, podeEditar }: {
    recebido: RecebidoObraMes[]
    custos: CustoRow[]
    classificacao: Classif[]
    obras: ObraRef[]
    podeEditar: boolean
}) {
    const supabase = createClient()
    const anoAtual = String(new Date().getFullYear())
    const [filtroAnos, setFiltroAnos] = useState<string[]>([anoAtual])
    const [filtroMeses, setFiltroMeses] = useState<string[]>([])
    const [aberta, setAberta] = useState<string | null>(null)

    // Classificação em estado (editável): insumo UPPER -> tipo
    const [classMap, setClassMap] = useState<Map<string, Classif['tipo']>>(
        () => new Map(classificacao.map(c => [c.insumo.trim().toUpperCase(), c.tipo])),
    )

    const anoOptions = useMemo(() => {
        const s = new Set<string>([anoAtual])
        recebido.forEach(r => s.add(r.ym.slice(0, 4)))
        custos.forEach(c => { if (c.data_movimento) s.add(c.data_movimento.slice(0, 4)) })
        return Array.from(s).sort()
    }, [recebido, custos])

    // ===== Linha 1: Margem de Contribuição Obras (Recebido Real x 6%) =====
    const nomeObra = useMemo(() => new Map(obras.filter(o => o.codigo).map(o => [o.codigo as string, o.nome])), [obras])
    const { mcTotal, recebidoTotal, drillObras } = useMemo(() => {
        const porObra = new Map<string, number>()
        let total = 0
        for (const r of recebido) {
            if (!matchPeriodo(r.ym, filtroAnos, filtroMeses)) continue
            porObra.set(r.obra, (porObra.get(r.obra) || 0) + r.valor)
            total += r.valor
        }
        const drill = Array.from(porObra.entries())
            .map(([obra, valor]) => ({ obra, valor, mc: valor * 0.06 }))
            .sort((a, b) => b.valor - a.valor)
        return { mcTotal: total * 0.06, recebidoTotal: total, drillObras: drill }
    }, [recebido, filtroAnos, filtroMeses])

    // ===== Linhas 2/3 + ignorados + a classificar (pagos da ADMCO) =====
    const buckets = useMemo(() => {
        const b: Record<Tipo, { total: number; itens: Map<string, { insumo: string; cliente: string; valor: number }> }> = {
            fixo: { total: 0, itens: new Map() },
            variavel: { total: 0, itens: new Map() },
            ignorado: { total: 0, itens: new Map() },
            nao_classificado: { total: 0, itens: new Map() },
        }
        for (const c of custos) {
            const ym = (c.data_movimento || '').slice(0, 7)
            if (!matchPeriodo(ym, filtroAnos, filtroMeses)) continue
            const valor = Number(c.vlr_at_pago || 0)
            if (!valor) continue
            const insumo = (c.descrinsumo || '—').trim()
            const tipo: Tipo = classMap.get(insumo.toUpperCase()) ?? 'nao_classificado'
            const k = `${insumo}|||${(c.cliente || '—').trim()}`
            const cur = b[tipo].itens.get(k) ?? { insumo, cliente: (c.cliente || '—').trim(), valor: 0 }
            cur.valor += valor
            b[tipo].itens.set(k, cur)
            b[tipo].total += valor
        }
        return b
    }, [custos, filtroAnos, filtroMeses, classMap])

    const custoVariavel = buckets.variavel.total
    const custoFixo = buckets.fixo.total
    const naoClassificado = buckets.nao_classificado.total
    // Resultado: MC - variáveis - fixos (o não classificado também abate, com alerta)
    const resultado = mcTotal - custoVariavel - custoFixo - naoClassificado
    const custosTotais = custoVariavel + custoFixo + naoClassificado
    const pctEquilibrio = recebidoTotal > 0 ? (custosTotais / recebidoTotal) * 100 : 0
    const sedeSePagou = resultado >= 0

    async function mudarClassificacao(insumo: string, tipo: Classif['tipo']) {
        const upper = insumo.trim().toUpperCase()
        const anterior = classMap.get(upper)
        setClassMap(prev => new Map(prev).set(upper, tipo))
        const { error } = await supabase
            .from('dre_sede_classificacao' as any)
            .upsert({ insumo: upper, tipo, atualizado_em: new Date().toISOString() } as any, { onConflict: 'insumo' })
        if (error) {
            setClassMap(prev => {
                const m = new Map(prev)
                if (anterior) m.set(upper, anterior); else m.delete(upper)
                return m
            })
            toast.error('Erro ao salvar classificação: ' + error.message)
        } else {
            toast.success(`"${insumo}" marcado como ${TIPO_LABEL[tipo]}.`)
        }
    }

    const toggle = (k: string) => setAberta(prev => prev === k ? null : k)

    // ===== estilos =====
    const linhaBase: React.CSSProperties = {
        display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'center', gap: '12px',
        padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border-glass)',
    }
    const drillWrap: React.CSSProperties = { maxHeight: '340px', overflowY: 'auto', background: 'rgba(0,0,0,0.18)' }
    const th: React.CSSProperties = { textAlign: 'left', padding: '8px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', position: 'sticky', top: 0, background: '#131328' }
    const td: React.CSSProperties = { padding: '7px 20px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)' }

    function DrillCustos({ tipo }: { tipo: Tipo }) {
        const itens = Array.from(buckets[tipo].itens.values()).sort((a, b) => b.valor - a.valor)
        if (itens.length === 0) return <div style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>Sem lançamentos no período.</div>
        return (
            <div style={drillWrap}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={th}>Insumo</th><th style={th}>Cliente</th><th style={{ ...th, textAlign: 'right' }}>Valor pago</th>{podeEditar && <th style={{ ...th, textAlign: 'center' }}>Classificação</th>}</tr></thead>
                    <tbody>
                        {itens.map((it, i) => (
                            <tr key={i}>
                                <td style={{ ...td, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.insumo}>{it.insumo}</td>
                                <td style={{ ...td, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }} title={it.cliente}>{it.cliente}</td>
                                <td style={{ ...td, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(it.valor)}</td>
                                {podeEditar && (
                                    <td style={{ ...td, textAlign: 'center' }}>
                                        <select
                                            value={classMap.get(it.insumo.toUpperCase()) ?? ''}
                                            onChange={e => mudarClassificacao(it.insumo, e.target.value as Classif['tipo'])}
                                            onClick={e => e.stopPropagation()}
                                            className="select-field"
                                            style={{ padding: '3px 8px', fontSize: '12px', minWidth: '110px' }}
                                        >
                                            <option value="" disabled>A classificar</option>
                                            <option value="fixo">Fixo</option>
                                            <option value="variavel">Variável</option>
                                            <option value="ignorado">Ignorado</option>
                                        </select>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    function Linha({ id, titulo, subtitulo, valor, cor, drill, negativo }: {
        id: string; titulo: string; subtitulo?: string; valor: number; cor: string
        drill: React.ReactNode; negativo?: boolean
    }) {
        const aberto = aberta === id
        return (
            <div>
                <div style={linhaBase} onClick={() => toggle(id)}>
                    <span style={{ color: 'var(--text-muted)' }}>{aberto ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</span>
                    <div>
                        <div style={{ fontSize: '14.5px', fontWeight: 700 }}>{titulo}</div>
                        {subtitulo && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitulo}</div>}
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: cor, whiteSpace: 'nowrap' }}>
                        {negativo ? '− ' : ''}{formatCurrency(valor)}
                    </div>
                </div>
                {aberto && drill}
            </div>
        )
    }

    const labelPeriodo = `${filtroMeses.length ? filtroMeses.map(m => MESES_FILTRO.find(x => x.v === m)?.n).join(', ') : 'Todos os meses'} · ${filtroAnos.length ? filtroAnos.join(', ') : 'Todos os anos'}`

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Landmark size={22} color="#f59e0b" /> DRE Sede (ADMCO)
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Regime de caixa (só o pago) · empréstimos e juros ignorados · clique nas linhas para abrir o detalhe
                </p>
            </div>

            {/* Filtros */}
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Ano</label>
                    <MultiSelect selected={filtroAnos} onChange={setFiltroAnos} options={anoOptions.map(a => ({ value: a, label: a }))} placeholder="Todos os anos" minWidth={150} />
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Mês</label>
                    <MultiSelect selected={filtroMeses} onChange={setFiltroMeses} options={MESES_FILTRO.map(m => ({ value: m.v, label: m.n }))} placeholder="Todos os meses" minWidth={170} />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', paddingBottom: '10px' }}>Período: {labelPeriodo}</span>
            </div>

            {/* DRE */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <Linha
                    id="mc" cor="#10b981"
                    titulo="1 · Margem de Contribuição Obras"
                    subtitulo={`Total Recebido Real ${formatCurrency(recebidoTotal)} × 6%`}
                    valor={mcTotal}
                    drill={
                        <div style={drillWrap}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr><th style={th}>Obra</th><th style={{ ...th, textAlign: 'right' }}>Recebido Real</th><th style={{ ...th, textAlign: 'right' }}>Contribuição (6%)</th></tr></thead>
                                <tbody>
                                    {drillObras.map((o, i) => (
                                        <tr key={i}>
                                            <td style={td}>{o.obra}{nomeObra.has(o.obra) ? ` — ${nomeObra.get(o.obra)}` : ''}</td>
                                            <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatCurrency(o.valor)}</td>
                                            <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: '#10b981', whiteSpace: 'nowrap' }}>{formatCurrency(o.mc)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    }
                />
                <Linha
                    id="variaveis" cor="#f59e0b" negativo
                    titulo="2 · Custos Variáveis"
                    subtitulo="Pagos da ADMCO classificados como variáveis"
                    valor={custoVariavel}
                    drill={<DrillCustos tipo="variavel" />}
                />
                <Linha
                    id="fixos" cor="#f59e0b" negativo
                    titulo="3 · Custos Fixos"
                    subtitulo="Pagos da ADMCO classificados como fixos"
                    valor={custoFixo}
                    drill={<DrillCustos tipo="fixo" />}
                />
                {naoClassificado > 0 && (
                    <Linha
                        id="nao_classificado" cor="#fb923c" negativo
                        titulo="⚠ A classificar"
                        subtitulo="Insumos novos sem classificação — abatem do resultado; classifique-os abaixo"
                        valor={naoClassificado}
                        drill={<DrillCustos tipo="nao_classificado" />}
                    />
                )}
                <Linha
                    id="resultado" cor={sedeSePagou ? '#10b981' : '#ef4444'}
                    titulo="4 · Resultado (a sede se pagou?)"
                    subtitulo={sedeSePagou
                        ? `✅ A sede se pagou no período — os 6% cobrem os custos (custos = ${pctEquilibrio.toFixed(2)}% do Recebido Real)`
                        : `❌ Não se pagou — para o ponto de equilíbrio, a margem das obras precisaria ser de ${pctEquilibrio.toFixed(2)}% (hoje 6%)`}
                    valor={resultado}
                    drill={
                        <div style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 2 }}>
                            <div>Margem de Contribuição Obras: <strong style={{ color: '#10b981' }}>{formatCurrency(mcTotal)}</strong></div>
                            <div>(−) Custos Variáveis: <strong style={{ color: '#f59e0b' }}>{formatCurrency(custoVariavel)}</strong></div>
                            <div>(−) Custos Fixos: <strong style={{ color: '#f59e0b' }}>{formatCurrency(custoFixo)}</strong></div>
                            {naoClassificado > 0 && <div>(−) A classificar: <strong style={{ color: '#fb923c' }}>{formatCurrency(naoClassificado)}</strong></div>}
                            <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '6px', paddingTop: '6px' }}>
                                (=) Resultado: <strong style={{ color: sedeSePagou ? '#10b981' : '#ef4444' }}>{formatCurrency(resultado)}</strong>
                                {' · '}% de equilíbrio: <strong>{pctEquilibrio.toFixed(2)}%</strong>
                            </div>
                        </div>
                    }
                />
                {/* Ignorados (transparência): não entram no resultado */}
                {buckets.ignorado.total > 0 && (
                    <Linha
                        id="ignorados" cor="var(--text-muted)"
                        titulo="Ignorados (empréstimos e juros)"
                        subtitulo="Fora do DRE — empréstimos pagam custos das obras, só transitam pela ADMCO"
                        valor={buckets.ignorado.total}
                        drill={<DrillCustos tipo="ignorado" />}
                    />
                )}
            </div>
        </div>
    )
}
