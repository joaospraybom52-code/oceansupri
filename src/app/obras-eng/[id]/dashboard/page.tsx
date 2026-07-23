import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Percent,
  AlertTriangle,
  Clock,
  ShieldAlert,
  User,
  Wallet,
} from 'lucide-react'
import DashboardCharts from './DashboardCharts'
import type { MedicaoChartItem, PPCChartItem } from './DashboardCharts'

/* ────────────────────────── Currency helper ────────────────────────── */

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/* ────────────────────────── Page ────────────────────────── */

export default async function ObraDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    /* ── 1. Orçamento ── */
    const { data: itensOrcamento, error: errOrc } = await supabase
      .from('itens_orcamento')
      .select('valor_total_orcado')
      .eq('obra_id', id)

    if (errOrc) throw new Error(errOrc.message)

    const totalOrcamento =
      itensOrcamento?.reduce((acc, i) => acc + (i.valor_total_orcado || 0), 0) || 0

    /* ── 2. Medições + Itens de Medição ── */
    const { data: medicoes, error: errMed } = await supabase
      .from('medicoes')
      .select('id, periodo_inicio, periodo_fim, status, tipo, valor_sinal')
      .eq('obra_id', id)
      .order('periodo_inicio', { ascending: true })

    if (errMed) throw new Error(errMed.message)

    // Fetch all medicao_itens for these medicoes
    const medicaoIds = (medicoes ?? []).map((m) => m.id)
    let allMedicaoItens: { medicao_id: string | null; valor_medido: number | null }[] = []

    if (medicaoIds.length > 0) {
      const { data: mItens, error: errMI } = await supabase
        .from('medicao_itens')
        .select('medicao_id, valor_medido')
        .in('medicao_id', medicaoIds)

      if (errMI) throw new Error(errMI.message)
      allMedicaoItens = mItens ?? []
    }

    // Build chart data
    let acumulado = 0
    const medicoesChartData: MedicaoChartItem[] = (medicoes ?? []).map((m) => {
      const ehSinal = (m as { tipo?: string | null }).tipo === 'sinal'
      const valorMedido = ehSinal
        ? Number((m as { valor_sinal?: number | null }).valor_sinal || 0)
        : allMedicaoItens
            .filter((mi) => mi.medicao_id === m.id)
            .reduce((sum, mi) => sum + (Number(mi.valor_medido) || 0), 0)
      acumulado += valorMedido
      const inicio = new Date(m.periodo_inicio + 'T00:00:00')
      const fim = new Date(m.periodo_fim + 'T00:00:00')
      const label = inicio.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      const periodoLabel = ehSinal
        ? `Sinal — ${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
        : `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
      return { id: m.id, label, periodoLabel, valorMedido, acumulado }
    })

    const totalMedido = acumulado
    const percExecutado = totalOrcamento > 0 ? (totalMedido / totalOrcamento) * 100 : 0

    /* ── 3. Programações Semanais + Tarefas (PPC) ── */
    const { data: programacoes, error: errProg } = await supabase
      .from('programacoes_semanais')
      .select('id, semana_referente_inicio, semana_referente_fim')
      .eq('obra_id', id)
      .order('semana_referente_inicio', { ascending: true })

    if (errProg) throw new Error(errProg.message)

    const progIds = (programacoes ?? []).map((p) => p.id)
    let allTarefas: { programacao_id: string | null; status: string | null }[] = []

    if (progIds.length > 0) {
      const { data: tarefas, error: errT } = await supabase
        .from('tarefas')
        .select('programacao_id, status')
        .in('programacao_id', progIds)

      if (errT) throw new Error(errT.message)
      allTarefas = tarefas ?? []
    }

    const ppcChartData: PPCChartItem[] = (programacoes ?? [])
      .map((p) => {
        const tarefasDaProg = allTarefas.filter((t) => t.programacao_id === p.id)
        const total = tarefasDaProg.length
        if (total === 0) return null
        const concluidas = tarefasDaProg.filter((t) => t.status === 'concluida').length
        const ppc = (concluidas / total) * 100
        const inicio = new Date(p.semana_referente_inicio + 'T00:00:00')
        const label = `Sem ${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
        return { id: p.id, label, ppc, programadas: total, executadas: concluidas }
      })
      .filter(Boolean) as PPCChartItem[]

    /* ── 4. Restrições (Gargalos) ── */
    const { data: restricoes, error: errRes } = await supabase
      .from('restricoes')
      .select('id, descricao, categoria, responsavel, prazo_remocao, status')
      .eq('obra_id', id)
      .neq('status', 'removida')
      .order('prazo_remocao', { ascending: true })

    if (errRes) throw new Error(errRes.message)

    const restricoesAbertas = restricoes ?? []
    const restricoesPendentes = restricoesAbertas.filter((r) => r.status === 'pendente').length

    /* ── 5. Custo (UAU) — Planejado vs Saldo, casando pelo código UAU da obra ── */
    const { data: obraRow } = await supabase
      .from('obras_eng')
      .select('codigo_uau')
      .eq('id', id)
      .single()
    const codigoUau = (obraRow as any)?.codigo_uau?.toString().trim() || null

    let custoPlanejado = 0
    let custoSaldo = 0
    let temCusto = false
    if (codigoUau) {
      const [{ data: custoLinhas }, { data: custoOrc }] = await Promise.all([
        supabase
          .from('custo_uau')
          .select('item_plt, serv_plt, valor_aprov, saldo_vlr_vinc')
          .eq('obra_plt', codigoUau),
        supabase
          .from('custo_orcamento')
          .select('valor_planejado')
          .eq('obra_plt', codigoUau),
      ])
      // Planejado total = soma do orçamento (mesma base da aba Acompanhamento de Custo)
      const planejado = ((custoOrc as any[]) ?? []).reduce(
        (s, o) => s + Number(o.valor_planejado || 0), 0,
      )
      // Custo (aprov) e Vinculado totais = linhas-raiz (serviço '-1' sem ponto no item)
      let aprov = 0, vinc = 0
      for (const l of ((custoLinhas as any[]) ?? [])) {
        const item = (l.item_plt || '').toString()
        if (String(l.serv_plt) === '-1' && !item.includes('.')) {
          aprov += Number(l.valor_aprov || 0)
          vinc += Number(l.saldo_vlr_vinc || 0)
        }
      }
      custoPlanejado = planejado
      custoSaldo = planejado - aprov - vinc      // Saldo = Planejado − Custo − Vinculado
      temCusto = ((custoLinhas?.length ?? 0) > 0) || planejado > 0
    }

    // Cor/%, mesma régua de status da aba de custo
    const custoConsumido = custoPlanejado - custoSaldo
    const pctConsumido = custoPlanejado > 0 ? (custoConsumido / custoPlanejado) * 100 : 0
    const saldoColor =
      custoSaldo <= 0 ? '#ef4444' : custoSaldo <= 0.4 * custoPlanejado ? '#f59e0b' : '#10b981'

    /* ────────────────────────── Urgency helper ────────────────────────── */

    function getUrgency(prazo: string | null) {
      if (!prazo) return { color: '#64748b', label: 'Sem prazo', bg: 'rgba(100,116,139,0.1)' }
      const diff = Math.ceil(
        (new Date(prazo + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (diff < 0)
        return { color: '#ef4444', label: `${Math.abs(diff)}d atrasada`, bg: 'rgba(239,68,68,0.12)' }
      if (diff <= 3)
        return { color: '#f59e0b', label: `${diff}d restantes`, bg: 'rgba(245,158,11,0.12)' }
      return { color: '#10b981', label: `${diff}d restantes`, bg: 'rgba(16,185,129,0.08)' }
    }

    /* ────────────────────────── Category badge colors ────────────────────────── */

    function getCategoryStyle(cat: string | null) {
      const map: Record<string, { bg: string; color: string }> = {
        'Projeto':       { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
        'Material':      { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
        'Mão de Obra':   { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
        'Equipamento':   { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
        'Subcontratado': { bg: 'rgba(139,92,246,0.15)',   color: '#a78bfa' },
        'Financeiro':    { bg: 'rgba(6,182,212,0.15)',    color: '#22d3ee' },
      }
      return map[cat ?? ''] ?? { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' }
    }

    /* ═══════════════════════════ RENDER ═══════════════════════════ */

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* ─── KPI Cards ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Orçamento Total */}
          <KPICard
            icon={<DollarSign size={22} />}
            label="Orçamento Total"
            value={fmt.format(totalOrcamento)}
            accentColor="#6366f1"
            gradientClass=""
          />

          {/* Total Medido */}
          <KPICard
            icon={<BarChart3 size={22} />}
            label="Total Medido"
            value={fmt.format(totalMedido)}
            accentColor="#10b981"
            gradientClass="green"
          />

          {/* % Executado */}
          <KPICard
            icon={<Percent size={22} />}
            label="% Executado"
            value={`${percExecutado.toFixed(1)}%`}
            accentColor={percExecutado > 75 ? '#10b981' : percExecutado > 40 ? '#f59e0b' : '#6366f1'}
            gradientClass={percExecutado > 75 ? 'green' : ''}
            subtitle={
              totalOrcamento > 0
                ? `${fmt.format(totalMedido)} de ${fmt.format(totalOrcamento)}`
                : undefined
            }
          />

          {/* Restrições Pendentes */}
          <KPICard
            icon={<AlertTriangle size={22} />}
            label="Restrições Pendentes"
            value={String(restricoesPendentes)}
            accentColor={restricoesPendentes > 0 ? '#ef4444' : '#10b981'}
            gradientClass={restricoesPendentes > 0 ? 'red' : 'green'}
            subtitle={`${restricoesAbertas.length} abertas no total`}
          />
        </div>

        {/* ─── Custo (UAU): Planejado vs Saldo ─── */}
        {temCusto && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={20} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                  Custo (UAU) — Planejado vs Saldo
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Origem: Acompanhamento de Custo · código UAU {codigoUau}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '36px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '6px' }}>Planejado</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{fmt.format(custoPlanejado)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '6px' }}>Saldo</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: saldoColor, letterSpacing: '-0.02em' }}>{fmt.format(custoSaldo)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '6px' }}>Consumido</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                  {pctConsumido.toFixed(1)}%
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginLeft: '8px' }}>{fmt.format(custoConsumido)}</span>
                </div>
              </div>
            </div>

            <div style={{ height: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pctConsumido))}%`, background: saldoColor, borderRadius: '6px', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* ─── Charts ─── */}
        <DashboardCharts medicoesData={medicoesChartData} ppcData={ppcChartData} />

        {/* ─── Gargalos (Restrições) ─── */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldAlert size={20} color="#ef4444" />
              </div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#f1f5f9',
                  letterSpacing: '-0.01em',
                }}
              >
                Gargalos — Restrições Ativas
              </h3>
            </div>
            <span
              style={{
                fontSize: '13px',
                color: '#64748b',
                fontWeight: 500,
              }}
            >
              {restricoesAbertas.length} restriç{restricoesAbertas.length === 1 ? 'ão' : 'ões'}
            </span>
          </div>

          {restricoesAbertas.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 0',
                gap: '16px',
                opacity: 0.5,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp size={28} color="#10b981" />
              </div>
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
                Nenhuma restrição ativa. Excelente! 🎉
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {restricoesAbertas.map((r) => {
                const urgency = getUrgency(r.prazo_remocao)
                const catStyle = getCategoryStyle(r.categoria)
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '16px 20px',
                      background: urgency.bg,
                      border: `1px solid ${urgency.color}25`,
                      borderRadius: '10px',
                      borderLeft: `4px solid ${urgency.color}`,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Left content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Category badge */}
                        {r.categoria && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              background: catStyle.bg,
                              color: catStyle.color,
                            }}
                          >
                            {r.categoria}
                          </span>
                        )}

                        {/* Status badge */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background:
                              r.status === 'pendente'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(99, 102, 241, 0.15)',
                            color:
                              r.status === 'pendente' ? '#fbbf24' : '#818cf8',
                          }}
                        >
                          {r.status}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: '14px',
                          color: '#e2e8f0',
                          fontWeight: 500,
                          lineHeight: 1.5,
                          marginBottom: '8px',
                        }}
                      >
                        {r.descricao}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {r.responsavel && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color: '#94a3b8',
                            }}
                          >
                            <User size={13} />
                            {r.responsavel}
                          </div>
                        )}
                        {r.prazo_remocao && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color: urgency.color,
                              fontWeight: 600,
                            }}
                          >
                            <Clock size={13} />
                            {new Date(r.prazo_remocao + 'T00:00:00').toLocaleDateString('pt-BR')} — {urgency.label}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  } catch (err: any) {
    return (
      <div
        style={{
          padding: '28px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <AlertTriangle size={22} color="#ef4444" />
          <h3 style={{ color: '#f87171', fontWeight: 700, fontSize: '16px' }}>
            Erro ao carregar Dashboard
          </h3>
        </div>
        <pre
          style={{
            fontSize: '13px',
            color: '#fca5a5',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.06)',
            borderRadius: '8px',
          }}
        >
          {err.message || String(err)}
        </pre>
      </div>
    )
  }
}

/* ────────────────────────── KPI Card Component ────────────────────────── */

function KPICard({
  icon,
  label,
  value,
  accentColor,
  gradientClass,
  subtitle,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accentColor: string
  gradientClass: string
  subtitle?: string
}) {
  return (
    <div className={`kpi-card ${gradientClass}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            padding: '10px',
            borderRadius: '12px',
            background: `${accentColor}18`,
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </h3>
      </div>
      <p
        style={{
          fontSize: '30px',
          fontWeight: 800,
          color: '#f1f5f9',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      {subtitle && (
        <p
          style={{
            fontSize: '12px',
            color: '#64748b',
            marginTop: '8px',
            fontWeight: 500,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
