import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
    HardHat,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Plus,
    ArrowRight,
    Calendar,
} from 'lucide-react'
import GlobalCharts, { type ObraChartData } from './GlobalCharts'
import RankingsObras from './RankingsObras'

export const dynamic = 'force-dynamic'

// ─── Formatters ──────────────────────────────────────────────────────
const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
})

const currencyCompact = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
})

const STATUS_LABELS: Record<string, string> = {
    em_andamento: 'Em Andamento',
    planejamento: 'Planejamento',
    concluida: 'Concluída',
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    em_andamento: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    planejamento: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    concluida: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
}

// ─── Page ────────────────────────────────────────────────────────────
export default async function GlobalDashboardPage() {
    const supabase = await createServerSupabaseClient()

    // 1 ─ Fetch obras
    const { data: obras, error: obrasError } = await supabase
        .from('obras_eng')
        .select('*')
        .order('created_at', { ascending: false })

    if (obrasError) {
        return (
            <div style={{ padding: '32px' }}>
                <div
                    className="glass-card"
                    style={{
                        padding: '24px',
                        borderColor: 'var(--accent-red)',
                        background: 'rgba(239,68,68,0.06)',
                    }}
                >
                    <h3 style={{ color: 'var(--accent-red)', marginBottom: '8px', fontSize: '16px' }}>
                        Erro ao carregar Dashboard Global
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {obrasError.message}
                    </p>
                </div>
            </div>
        )
    }

    const obrasList = obras ?? []
    const obraIds = obrasList.map((o) => o.id)

    // 2 ─ Carrega tudo em LOTE (6 queries no total, em vez de N+1 por obra)
    const empty = { data: [] as any[] }
    const [itensRes, medsRes, restrRes, progsRes] = obraIds.length
        ? await Promise.all([
            supabase.from('itens_orcamento').select('obra_id, valor_total_orcado').in('obra_id', obraIds),
            supabase.from('medicoes').select('id, obra_id').in('obra_id', obraIds),
            supabase.from('restricoes').select('obra_id, status').in('obra_id', obraIds),
            supabase.from('programacoes_semanais').select('id, obra_id, status_envio').in('obra_id', obraIds),
        ])
        : [empty, empty, empty, empty]

    const itens = (itensRes.data ?? []) as { obra_id: string; valor_total_orcado: number | null }[]
    const meds = (medsRes.data ?? []) as { id: string; obra_id: string }[]
    const restr = (restrRes.data ?? []) as { obra_id: string; status: string | null }[]
    const progs = (progsRes.data ?? []) as { id: string; obra_id: string; status_envio: string | null }[]

    const medIds = meds.map((m) => m.id)
    const progIds = progs.map((p) => p.id)
    const [medItensRes, tfsRes] = await Promise.all([
        medIds.length ? supabase.from('medicao_itens').select('medicao_id, valor_medido').in('medicao_id', medIds) : Promise.resolve(empty),
        progIds.length ? supabase.from('tarefas').select('programacao_id, status').in('programacao_id', progIds) : Promise.resolve(empty),
    ])
    const medItens = (medItensRes.data ?? []) as { medicao_id: string; valor_medido: number | null }[]
    const tfs = (tfsRes.data ?? []) as { programacao_id: string; status: string | null }[]

    // Índices auxiliares
    const medToObra = new Map(meds.map((m) => [m.id, m.obra_id]))

    const enrichedObras: ObraChartData[] = obrasList.map((obra) => {
        const valorOrcado = itens.filter((i) => i.obra_id === obra.id).reduce((s, i) => s + (i.valor_total_orcado ?? 0), 0)
        const valorMedido = medItens.filter((mi) => medToObra.get(mi.medicao_id) === obra.id).reduce((s, mi) => s + (mi.valor_medido ?? 0), 0)

        const restrObra = restr.filter((r) => r.obra_id === obra.id)
        const restricoesTotal = restrObra.length
        const restricoesRemovidas = restrObra.filter((r) => r.status === 'removida').length
        const restricoesPend = restricoesTotal - restricoesRemovidas
        const irr = restricoesTotal > 0 ? (restricoesRemovidas / restricoesTotal) * 100 : 0

        const progsObra = progs.filter((p) => p.obra_id === obra.id)
        const enviadas = progsObra.filter((p) => p.status_envio === 'no_prazo' || p.status_envio === 'atrasada')
        const progEnviadas = enviadas.length
        const aderenciaPrazo = progEnviadas > 0 ? (enviadas.filter((p) => p.status_envio === 'no_prazo').length / progEnviadas) * 100 : 0

        const ppcs: number[] = []
        for (const p of progsObra) {
            const ts = tfs.filter((t) => t.programacao_id === p.id)
            if (ts.length > 0) ppcs.push((ts.filter((t) => t.status === 'concluida').length / ts.length) * 100)
        }
        const ppcMedio = ppcs.length ? ppcs.reduce((a, b) => a + b, 0) / ppcs.length : 0

        const percentual = valorOrcado > 0 ? (valorMedido / valorOrcado) * 100 : 0

        return {
            id: obra.id, nome: obra.nome, status: obra.status,
            valorOrcado, valorMedido, percentual, restricoes: restricoesPend,
            ppcMedio, aderenciaPrazo, progEnviadas, irr, restricoesTotal, restricoesRemovidas,
        }
    })

    // 3 ─ KPI totals
    const totalObras = obrasList.length
    const totalOrcado = enrichedObras.reduce((s, o) => s + o.valorOrcado, 0)
    const totalMedido = enrichedObras.reduce((s, o) => s + o.valorMedido, 0)
    const totalRestricoes = enrichedObras.reduce((s, o) => s + o.restricoes, 0)
    const percentualGlobal = totalOrcado > 0 ? (totalMedido / totalOrcado) * 100 : 0

    // ─── KPI definitions ────────────────────────────────────────────
    const kpis = [
        {
            label: 'Total de Obras',
            value: String(totalObras),
            icon: HardHat,
            gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            accentBg: 'rgba(99,102,241,0.12)',
            accentColor: '#6366f1',
        },
        {
            label: 'Valor Total Orçado',
            value: totalOrcado >= 1_000_000 ? currencyCompact.format(totalOrcado) : currency.format(totalOrcado),
            icon: DollarSign,
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
            accentBg: 'rgba(245,158,11,0.12)',
            accentColor: '#f59e0b',
        },
        {
            label: 'Valor Total Medido',
            value: totalMedido >= 1_000_000 ? currencyCompact.format(totalMedido) : currency.format(totalMedido),
            subtitle: `${percentualGlobal.toFixed(1)}% executado`,
            icon: TrendingUp,
            gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            accentBg: 'rgba(16,185,129,0.12)',
            accentColor: '#10b981',
        },
        {
            label: 'Restrições Pendentes',
            value: String(totalRestricoes),
            icon: AlertTriangle,
            gradient: totalRestricoes > 0
                ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            accentBg: totalRestricoes > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            accentColor: totalRestricoes > 0 ? '#ef4444' : '#10b981',
        },
    ]

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* ── Header ──────────────────────────────────────────── */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '32px',
                    flexWrap: 'wrap',
                    gap: '16px',
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '6px',
                            letterSpacing: '-0.5px',
                        }}
                    >
                        Dashboard Global de Engenharia
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Visão consolidada de todas as obras · Atualizado em{' '}
                        {new Date().toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                        })}
                    </p>
                </div>
                <Link
                    href="/obras-eng/nova"
                    className="btn-primary"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        textDecoration: 'none',
                        fontSize: '14px',
                    }}
                >
                    <Plus size={16} />
                    Nova Obra
                </Link>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '20px',
                    marginBottom: '32px',
                }}
            >
                {kpis.map((kpi) => {
                    const Icon = kpi.icon
                    return (
                        <div
                            key={kpi.label}
                            className="kpi-card"
                            style={{
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Top gradient bar — override the ::before via inline bg */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '3px',
                                    background: kpi.gradient,
                                }}
                            />
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                }}
                            >
                                <div
                                    style={{
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: kpi.accentBg,
                                        color: kpi.accentColor,
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon size={22} />
                                </div>
                                <div>
                                    <p
                                        style={{
                                            fontSize: '12px',
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.6px',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {kpi.label}
                                    </p>
                                    <h2
                                        style={{
                                            fontSize: '26px',
                                            fontWeight: 700,
                                            color: 'var(--text-primary)',
                                            marginTop: '4px',
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {kpi.value}
                                    </h2>
                                    {kpi.subtitle && (
                                        <p
                                            style={{
                                                fontSize: '12px',
                                                color: kpi.accentColor,
                                                marginTop: '4px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {kpi.subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ── Charts ──────────────────────────────────────────── */}
            <GlobalCharts obras={enrichedObras} />

            {/* ── Rankings de Planejamento ─────────────────────────── */}
            <div style={{ marginTop: '32px' }}>
                <RankingsObras obras={enrichedObras} />
            </div>

            {/* ── Tabela de Obras ──────────────────────────────────── */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div
                    style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid var(--border-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                background: 'rgba(99,102,241,0.12)',
                            }}
                        >
                            <HardHat size={18} color="#6366f1" />
                        </div>
                        <h3
                            style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                            }}
                        >
                            Monitoramento de Obras
                        </h3>
                    </div>
                    <span
                        style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            background: 'rgba(255,255,255,0.04)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                        }}
                    >
                        {totalObras} {totalObras === 1 ? 'obra' : 'obras'}
                    </span>
                </div>

                {obrasList.length === 0 ? (
                    <div
                        style={{
                            padding: '64px 24px',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px dashed rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}
                        >
                            <HardHat size={24} color="#64748b" />
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                            Nenhuma obra cadastrada no sistema.
                        </p>
                        <Link
                            href="/obras-eng/nova"
                            className="btn-secondary"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                textDecoration: 'none',
                            }}
                        >
                            <Plus size={14} />
                            Cadastrar primeira obra
                        </Link>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                textAlign: 'left',
                                minWidth: '900px',
                            }}
                        >
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    {[
                                        'Obra',
                                        'Status',
                                        'Orçamento',
                                        'Medido',
                                        '% Executado',
                                        'Restrições',
                                        '',
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            style={{
                                                padding: '14px 20px',
                                                color: 'var(--text-muted)',
                                                fontWeight: 600,
                                                fontSize: '11px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.8px',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {enrichedObras.map((obra) => {
                                    const ss = STATUS_STYLE[obra.status] || {
                                        bg: 'rgba(255,255,255,0.05)',
                                        color: '#94a3b8',
                                    }
                                    const rawObra = obrasList.find((o) => o.id === obra.id)
                                    return (
                                        <tr
                                            key={obra.id}
                                            style={{
                                                borderTop: '1px solid rgba(255,255,255,0.04)',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseOver={() => {}}
                                        >
                                            {/* Nome */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span
                                                        style={{
                                                            fontWeight: 600,
                                                            color: 'var(--text-primary)',
                                                            fontSize: '14px',
                                                        }}
                                                    >
                                                        {obra.nome}
                                                    </span>
                                                    {rawObra?.codigo_uau && (
                                                        <span style={{ fontSize: '11px', color: 'var(--accent-blue-light)', fontWeight: 500 }}>
                                                            UAU: {rawObra.codigo_uau} {rawObra.local ? `· 📍 ${rawObra.local}` : ''}
                                                        </span>
                                                    )}
                                                    {rawObra?.data_inicio && (
                                                        <span
                                                            style={{
                                                                fontSize: '11px',
                                                                color: 'var(--text-muted)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                            }}
                                                        >
                                                            <Calendar size={10} />
                                                            {new Date(rawObra.data_inicio).toLocaleDateString('pt-BR')}{' '}
                                                            {rawObra.data_fim
                                                                ? `→ ${new Date(rawObra.data_fim).toLocaleDateString('pt-BR')}`
                                                                : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '16px 20px' }}>
                                                <span
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        background: ss.bg,
                                                        color: ss.color,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {STATUS_LABELS[obra.status] || obra.status}
                                                </span>
                                            </td>

                                            {/* Orçamento */}
                                            <td
                                                style={{
                                                    padding: '16px 20px',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '13px',
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {obra.valorOrcado > 0
                                                    ? currency.format(obra.valorOrcado)
                                                    : '—'}
                                            </td>

                                            {/* Medido */}
                                            <td
                                                style={{
                                                    padding: '16px 20px',
                                                    color: obra.valorMedido > 0 ? '#10b981' : 'var(--text-muted)',
                                                    fontSize: '13px',
                                                    fontWeight: obra.valorMedido > 0 ? 600 : 400,
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {obra.valorMedido > 0
                                                    ? currency.format(obra.valorMedido)
                                                    : '—'}
                                            </td>

                                            {/* % Executado */}
                                            <td style={{ padding: '16px 20px' }}>
                                                {obra.valorOrcado > 0 ? (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            minWidth: '120px',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                flex: 1,
                                                                height: '6px',
                                                                background: 'rgba(255,255,255,0.06)',
                                                                borderRadius: '3px',
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width: `${Math.min(obra.percentual, 100)}%`,
                                                                    height: '100%',
                                                                    borderRadius: '3px',
                                                                    background:
                                                                        obra.percentual >= 80
                                                                            ? 'linear-gradient(90deg, #059669, #10b981)'
                                                                            : obra.percentual >= 40
                                                                              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                                                              : 'linear-gradient(90deg, #6366f1, #818cf8)',
                                                                    transition: 'width 0.6s ease',
                                                                }}
                                                            />
                                                        </div>
                                                        <span
                                                            style={{
                                                                fontSize: '12px',
                                                                color: 'var(--text-secondary)',
                                                                fontWeight: 600,
                                                                minWidth: '40px',
                                                                textAlign: 'right',
                                                                fontVariantNumeric: 'tabular-nums',
                                                            }}
                                                        >
                                                            {obra.percentual.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span
                                                        style={{
                                                            color: 'var(--text-muted)',
                                                            fontSize: '13px',
                                                        }}
                                                    >
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            {/* Restrições */}
                                            <td style={{ padding: '16px 20px' }}>
                                                {obra.restricoes > 0 ? (
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            padding: '3px 10px',
                                                            borderRadius: '20px',
                                                            background: 'rgba(239,68,68,0.1)',
                                                            color: '#ef4444',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        <AlertTriangle size={12} />
                                                        {obra.restricoes}
                                                    </span>
                                                ) : (
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: '#10b981',
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        ✓ Nenhuma
                                                    </span>
                                                )}
                                            </td>

                                            {/* Ação */}
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <Link
                                                    href={`/obras-eng/${obra.id}/dashboard`}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '7px 14px',
                                                        background: 'rgba(99,102,241,0.1)',
                                                        color: '#818cf8',
                                                        borderRadius: 'var(--radius-sm)',
                                                        textDecoration: 'none',
                                                        fontSize: '13px',
                                                        fontWeight: 500,
                                                        transition: 'all 0.2s',
                                                        border: '1px solid rgba(99,102,241,0.15)',
                                                    }}
                                                >
                                                    Acessar
                                                    <ArrowRight size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
