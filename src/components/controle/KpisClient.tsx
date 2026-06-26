'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { CheckCircle2, AlertCircle, ChevronDown, Search, X as XIcon } from 'lucide-react'
import { LineChart as RLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Obra {
    id: string
    nome: string
    codigo: string | null
    cidade: string | null
}

interface RecebidoRow {
    obra_rec: string | null
    tot_conf: number | null
    data_rec: string | null // YYYY-MM-DD
    tot_desc: number | null
    tot_princ: number | null
}

interface VendasRecRow {
    val_provisao_curto_vrec: number | null
    val_desconto_imposto_vrec: number | null
}

interface AReceberRow {
    obra: string | null
    data_prc: string | null // YYYY-MM-DD
    num_parc_ger: string | null
    val_provisao_curto_ven: number | null
    val_desconto_imposto_ven: number | null
    valor_prc: number | null
    data_fim_contrato_ven: string | null // YYYY-MM-DD
    hist_lanc_ven: string | null
    data_ven: string | null // YYYY-MM-DD (data da venda — usada no filtro de data)
}

interface VgvRow {
    codigo_obra: string | null
    ano: number | null
    valor_venda: number | null
}

interface PagoICRow {
    descrinsumo: string | null
    cliente: string | null
    data_movimento: string | null // YYYY-MM-01
    vlr_at_pagar: number | null
    vlr_at_pago: number | null
}

interface LinhaPag { chave: string; label: string; aPagar: number; pago: number }

interface PagoRow {
    obra: string | null
    data_movimento: string | null // YYYY-MM-DD
    tipo_controle: string | null
    vlr_at_pago: number | null
    vlr_at_pagar: number | null
    vlr_comp: number | null
    total_receita: number | null
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

// Formato "R$ -4.100.119,00" (sinal depois do R$), como no SVG do Power BI.
const brlExato = (v: number) =>
    'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// "R$ 3.757.807" (sem casas) — usado no chip TOTAL do painel.
const brlInteiro = (v: number) => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR')

// Formato curto para eixo do gráfico (R$ 1.2M, R$ 350K)
const brlCurto = (v: number) => {
    const a = Math.abs(v)
    if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
    if (a >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`
    return `R$ ${v.toFixed(0)}`
}

// "YYYY-MM-DD" -> "dd/mm/yyyy" (sem Date, pra não deslocar por fuso).
const ddmmyyyy = (iso: string | null) => {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
}

// Filtra por ano e/ou mês da data (YYYY-MM-DD). Vazio = não filtra.
// Filtra por anos e/ou meses (multi-seleção). Listas vazias = não filtra.
const matchPeriodo = (data: string | null, anos: string[], meses: string[]) => {
    if (anos.length === 0 && meses.length === 0) return true
    if (!data) return false
    if (anos.length && !anos.includes(data.slice(0, 4))) return false
    if (meses.length && !meses.includes(data.slice(5, 7))) return false
    return true
}

const MESES = [
    { v: '01', n: 'Janeiro' }, { v: '02', n: 'Fevereiro' }, { v: '03', n: 'Março' },
    { v: '04', n: 'Abril' }, { v: '05', n: 'Maio' }, { v: '06', n: 'Junho' },
    { v: '07', n: 'Julho' }, { v: '08', n: 'Agosto' }, { v: '09', n: 'Setembro' },
    { v: '10', n: 'Outubro' }, { v: '11', n: 'Novembro' }, { v: '12', n: 'Dezembro' },
]

export default function KpisClient({ obras, recebido, pago, vendasrec, areceber, vgv, pagoIC }: { obras: Obra[]; recebido: RecebidoRow[]; pago: PagoRow[]; vendasrec: VendasRecRow[]; areceber: AReceberRow[]; vgv: VgvRow[]; pagoIC: PagoICRow[] }) {
    // Filtros (dimensões código da obra + ano + mês)
    const [filtroCodigo, setFiltroCodigo] = useState('')
    const [filtroAnos, setFiltroAnos] = useState<string[]>([])
    const [filtroMeses, setFiltroMeses] = useState<string[]>([])
    // Cross-filter das tabelas drill-down: insumo selecionado filtra os clientes
    const [insumoSel, setInsumoSel] = useState<string | null>(null)

    // Anos disponíveis nas datas das tabelas-fato
    const anoOptions = useMemo(() => {
        const anos = new Set<string>()
        const add = (d: string | null) => { if (d) anos.add(d.slice(0, 4)) }
        recebido.forEach(r => add(r.data_rec))
        pago.forEach(p => add(p.data_movimento))
        areceber.forEach(a => add(a.data_ven))
        vgv.forEach(v => { if (v.ano != null) anos.add(String(v.ano)) })
        return Array.from(anos).filter(Boolean).sort((a, b) => b.localeCompare(a))
    }, [recebido, pago, areceber, vgv])

    // Opções de obra montadas a partir dos códigos presentes nas tabelas-fato
    // (recebido + pago), usando o nome da tabela obras quando existir.
    const obraOptions = useMemo(() => {
        const nomePorCodigo = new Map(obras.filter(o => o.codigo).map(o => [o.codigo as string, o.nome]))
        const codigos = new Set<string>()
        recebido.forEach(r => { if (r.obra_rec) codigos.add(r.obra_rec) })
        pago.forEach(p => { if (p.obra) codigos.add(p.obra) })
        areceber.forEach(a => { if (a.obra) codigos.add(a.obra) })
        vgv.forEach(v => { if (v.codigo_obra) codigos.add(v.codigo_obra) })
        return Array.from(codigos).sort((a, b) => a.localeCompare(b)).map(codigo => ({
            codigo,
            label: nomePorCodigo.has(codigo) ? `${codigo} - ${nomePorCodigo.get(codigo)}` : codigo,
        }))
    }, [obras, recebido, pago, areceber, vgv])

    // recebido filtrado por obra + período (dimensões)
    const recebidoFiltrado = useMemo(() => recebido.filter(r =>
        (!filtroCodigo || r.obra_rec === filtroCodigo) && matchPeriodo(r.data_rec, filtroAnos, filtroMeses),
    ), [recebido, filtroCodigo, filtroAnos, filtroMeses])

    // Total Recebido Real = SUM(recebido[TotConf])
    const totalRecebidoReal = useMemo(() => recebidoFiltrado
        .reduce((s, r) => s + Number(r.tot_conf || 0), 0), [recebidoFiltrado])

    // Descontos = SUM(recebido[TotDesc])
    const descontos = useMemo(() => recebidoFiltrado
        .reduce((s, r) => s + Number(r.tot_desc || 0), 0), [recebidoFiltrado])

    // Valor Recebido Bruto =
    //   ( SUM(TotConf) + SUM(TotDesc) )
    //   + CALCULATE( SUM(vendasrecebidas[ValDescontoImposto_vrec]),
    //               TREATAS( VALUES(recebido[TotPrinc]), vendasrecebidas[ValProvisaoCurto_Vrec] ) )
    // O TREATAS soma o desconto de imposto das vendas cujo ValProvisaoCurto
    // coincide (valor) com algum TotPrinc do recebido no contexto atual.
    const valorRecebidoBruto = useMemo(() => {
        const somaRecebido = recebidoFiltrado.reduce((s, r) => s + Number(r.tot_conf || 0) + Number(r.tot_desc || 0), 0)
        const setTotPrinc = new Set(recebidoFiltrado.map(r => Number(r.tot_princ || 0).toFixed(2)))
        const somaDescImposto = vendasrec
            .filter(v => setTotPrinc.has(Number(v.val_provisao_curto_vrec || 0).toFixed(2)))
            .reduce((s, v) => s + Number(v.val_desconto_imposto_vrec || 0), 0)
        return somaRecebido + somaDescImposto
    }, [recebidoFiltrado, vendasrec])

    // pago já filtrado por obra + período (dimensões); as medidas abaixo só
    // aplicam o filtro de TipoControle por cima.
    const pagoFiltrado = useMemo(() => pago.filter(p =>
        (!filtroCodigo || p.obra === filtroCodigo) && matchPeriodo(p.data_movimento, filtroAnos, filtroMeses),
    ), [pago, filtroCodigo, filtroAnos, filtroMeses])

    // Total Pago = SUM(VlrAtPago) onde TipoControle = "Despesas"
    const totalPago = useMemo(() => pagoFiltrado
        .filter(p => p.tipo_controle === 'Despesas')
        .reduce((s, p) => s + Number(p.vlr_at_pago || 0), 0), [pagoFiltrado])

    // Total A Pagar = SUM(VlrAtPagar) onde TipoControle = "Despesas"
    const totalAPagar = useMemo(() => pagoFiltrado
        .filter(p => p.tipo_controle === 'Despesas')
        .reduce((s, p) => s + Number(p.vlr_at_pagar || 0), 0), [pagoFiltrado])

    // Controle Financeiro Saída = SUM(TotalReceita) onde TipoControle = "DespSaida"
    const controleFinanceiroSaida = useMemo(() => pagoFiltrado
        .filter(p => p.tipo_controle === 'DespSaida')
        .reduce((s, p) => s + Number(p.total_receita || 0), 0), [pagoFiltrado])

    // Total Comprometido Obra = Total Pago + Total A Pagar + Controle Financeiro Saída
    const totalComprometidoObra = totalPago + totalAPagar + controleFinanceiroSaida

    // A_receber filtrado por obra + período (dimensões)
    const areceberFiltrado = useMemo(() => areceber.filter(a =>
        (!filtroCodigo || a.obra === filtroCodigo) && matchPeriodo(a.data_ven, filtroAnos, filtroMeses),
    ), [areceber, filtroCodigo, filtroAnos, filtroMeses])

    // Faturado a Receber = SUM(ValProvisaoCurto_Ven) + SUM(ValDescontoImposto_ven) onde NumParcGer_Prc = '1'
    const faturadoAReceber = useMemo(() => areceberFiltrado
        .filter(a => a.num_parc_ger === '1')
        .reduce((s, a) => s + Number(a.val_provisao_curto_ven || 0) + Number(a.val_desconto_imposto_ven || 0), 0),
        [areceberFiltrado])

    // Retenções = SUM(A_receber[Valor_Prc]) onde VALUE(NumParcGer_Prc) >= 2
    const retencoes = useMemo(() => areceberFiltrado
        .filter(a => Number(a.num_parc_ger) >= 2)
        .reduce((s, a) => s + Number(a.valor_prc || 0), 0),
        [areceberFiltrado])

    // Valor de Venda (VGV) = SUM(VGV[VALOR DE VENDA]) — filtrado por obra e por ano (VGV[ano]).
    // O Mês não se aplica (VGV só tem ano).
    const valorVendaVGV = useMemo(() => vgv
        .filter(v => (!filtroCodigo || v.codigo_obra === filtroCodigo) && (filtroAnos.length === 0 || filtroAnos.includes(String(v.ano ?? ''))))
        .reduce((s, v) => s + Number(v.valor_venda || 0), 0),
        [vgv, filtroCodigo, filtroAnos])

    // pagoIC filtrado pelo Ano/Mês (data_movimento) — o filtro de data agora vale nas tabelas
    const pagoICFiltrado = useMemo(() => pagoIC.filter(r => matchPeriodo(r.data_movimento, filtroAnos, filtroMeses)),
        [pagoIC, filtroAnos, filtroMeses])

    // Tabela 1: agrupado por Insumo (DescrInsumo)
    const linhasInsumo = useMemo(() => {
        const m = new Map<string, LinhaPag>()
        for (const r of pagoICFiltrado) {
            const k = r.descrinsumo ?? '—'
            const cur = m.get(k) ?? { chave: k, label: k, aPagar: 0, pago: 0 }
            cur.aPagar += Number(r.vlr_at_pagar || 0); cur.pago += Number(r.vlr_at_pago || 0)
            m.set(k, cur)
        }
        return Array.from(m.values())
    }, [pagoICFiltrado])

    // Tabela 2: agrupado por Cliente, filtrado pelo insumo selecionado
    const linhasCliente = useMemo(() => {
        const m = new Map<string, LinhaPag>()
        for (const r of pagoICFiltrado) {
            if (insumoSel && (r.descrinsumo ?? '—') !== insumoSel) continue
            const k = r.cliente ?? '—'
            const cur = m.get(k) ?? { chave: k, label: k, aPagar: 0, pago: 0 }
            cur.aPagar += Number(r.vlr_at_pagar || 0); cur.pago += Number(r.vlr_at_pago || 0)
            m.set(k, cur)
        }
        return Array.from(m.values())
    }, [pagoICFiltrado, insumoSel])

    const limparFiltros = () => { setFiltroCodigo(''); setFiltroAnos([]); setFiltroMeses([]) }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>KPI&apos;S</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Indicadores de recebimento por obra e período</p>
            </div>

            {/* Filtros */}
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                <div>
                    <label style={lbl}>Código da obra</label>
                    <SearchSelect
                        value={filtroCodigo}
                        onChange={setFiltroCodigo}
                        options={obraOptions.map(o => ({ value: o.codigo, label: o.label }))}
                        placeholder="Todas as obras"
                        minWidth={280}
                    />
                </div>
                <div>
                    <label style={lbl}>Ano</label>
                    <MultiSelect
                        selected={filtroAnos}
                        onChange={setFiltroAnos}
                        options={anoOptions.map(a => ({ value: a, label: a }))}
                        placeholder="Todos os anos"
                        minWidth={150}
                    />
                </div>
                <div>
                    <label style={lbl}>Mês</label>
                    <MultiSelect
                        selected={filtroMeses}
                        onChange={setFiltroMeses}
                        options={MESES.map(m => ({ value: m.v, label: m.n }))}
                        placeholder="Todos os meses"
                        minWidth={170}
                    />
                </div>
                {(filtroCodigo || filtroAnos.length > 0 || filtroMeses.length > 0) && <button onClick={limparFiltros} className="btn-secondary">Limpar filtros</button>}
            </div>

            {/* Cards de KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 200px))', gap: '16px', justifyContent: 'center' }}>
                <KpiCard label="Total Recebido Real" value={formatCurrency(totalRecebidoReal)} />
                <KpiCard label="Valor Recebido Bruto" value={formatCurrency(valorRecebidoBruto)} />
                <KpiCard label="Faturado a Receber" value={formatCurrency(faturadoAReceber)} />
                <KpiCard label="Descontos" value={formatCurrency(descontos)} />
                <KpiCard label="Retenções" value={formatCurrency(retencoes)} />
                <KpiCard label="6% Sede" value={formatCurrency(valorRecebidoBruto * 0.06)} />
                <KpiCard label="Total Pago" value={formatCurrency(totalPago)} />
                <KpiCard label="Total A Pagar" value={formatCurrency(totalAPagar)} />
                <KpiCard label="Controle Financeiro Saída" value={formatCurrency(controleFinanceiroSaida)} />
                <KpiCard label="Total Comprometido Obra" value={formatCurrency(totalComprometidoObra)} />
            </div>

            {/* Indicador Evolução + Balanço da Obra */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px', marginTop: '24px', alignItems: 'start' }}>
                <IndicadorEvolucao valorVenda={valorVendaVGV} valorMedido={valorRecebidoBruto} valorFaturado={faturadoAReceber} />
                <BalancoCard receita={totalRecebidoReal} despesa={totalPago + controleFinanceiroSaida} />
            </div>

            {/* Gráfico ao lado do Próximas Medições (mesma divisão pra alinhar) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px', marginTop: '24px', alignItems: 'start' }}>
                <GraficoEvolucao recebido={recebido} pago={pago} />
                <ProximasMedicoes rows={areceberFiltrado} />
            </div>

            {/* Tabelas drill-down: Insumos x Clientes (cross-filter) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px', marginTop: '24px', alignItems: 'start' }}>
                <TabelaPagamentos
                    colLabel="INSUMOS"
                    linhas={linhasInsumo}
                    selecionada={insumoSel}
                    onClickLinha={(chave) => setInsumoSel(prev => prev === chave ? null : chave)}
                />
                <TabelaPagamentos
                    colLabel={insumoSel ? `CLIENTE · ${insumoSel}` : 'CLIENTE'}
                    linhas={linhasCliente}
                    ordemInicial="pago"
                />
            </div>
        </div>
    )
}

const lbl: React.CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }

interface Opcao { value: string; label: string }

// Multi-seleção com checkboxes (Ano, Mês)
function MultiSelect({ options, selected, onChange, placeholder, minWidth }: {
    options: Opcao[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string; minWidth?: number
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!open) return
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [open])
    const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
    const display = selected.length === 0 ? placeholder : options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')
    return (
        <div ref={ref} className="dd" style={{ minWidth }}>
            <button type="button" className="dd-box" onClick={() => setOpen(o => !o)}>
                <span className={selected.length ? 'dd-val' : 'dd-ph'}>{display}</span>
                <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
            </button>
            {open && (
                <div className="dd-menu">
                    {options.length === 0 ? <div className="dd-empty">Sem opções</div> : options.map(o => (
                        <label key={o.value} className="dd-opt">
                            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
                            <span>{o.label}</span>
                        </label>
                    ))}
                    {selected.length > 0 && <button type="button" className="dd-clear" onClick={() => onChange([])}>Limpar seleção</button>}
                </div>
            )}
            <style jsx>{`
                .dd { position: relative; }
                .dd-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: 8px; color: var(--text-primary); cursor: pointer; font-family: inherit; font-size: 14px; }
                .dd-val { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
                .dd-ph { color: var(--text-muted); }
                .dd-menu { position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; min-width: 100%; background: #14142b; border: 1px solid var(--border-glass); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); padding: 6px; max-height: 300px; overflow-y: auto; }
                .dd-opt { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
                .dd-opt:hover { background: rgba(255,255,255,0.06); }
                .dd-opt input { accent-color: #6366f1; cursor: pointer; width: 15px; height: 15px; }
                .dd-clear { margin-top: 4px; width: 100%; padding: 7px; background: none; border: none; border-top: 1px solid var(--border-glass); color: var(--text-muted); cursor: pointer; font-size: 12px; }
                .dd-clear:hover { color: var(--text-primary); }
                .dd-empty { padding: 8px; color: var(--text-muted); font-size: 13px; }
            `}</style>
        </div>
    )
}

// Seleção única com busca por nome (Código da obra)
function SearchSelect({ options, value, onChange, placeholder, minWidth }: {
    options: Opcao[]; value: string; onChange: (v: string) => void; placeholder: string; minWidth?: number
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!open) return
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') } }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [open])
    const selLabel = options.find(o => o.value === value)?.label ?? ''
    const q = query.trim().toLowerCase()
    const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options
    const pick = (v: string) => { onChange(v); setOpen(false); setQuery('') }
    return (
        <div ref={ref} className="ss" style={{ minWidth }}>
            <button type="button" className="ss-box" onClick={() => setOpen(o => !o)}>
                <span className={value ? 'ss-val' : 'ss-ph'}>{value ? selLabel : placeholder}</span>
                {value
                    ? <XIcon size={15} style={{ flexShrink: 0, opacity: 0.7 }} onClick={(e) => { e.stopPropagation(); onChange('') }} />
                    : <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.7 }} />}
            </button>
            {open && (
                <div className="ss-menu">
                    <div className="ss-search">
                        <Search size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por código ou nome..." />
                    </div>
                    <div className="ss-list">
                        <button type="button" className={`ss-opt${!value ? ' sel' : ''}`} onClick={() => pick('')}>Todas as obras</button>
                        {filtered.length === 0 ? <div className="ss-empty">Nada encontrado</div> : filtered.map(o => (
                            <button type="button" key={o.value} className={`ss-opt${o.value === value ? ' sel' : ''}`} onClick={() => pick(o.value)}>{o.label}</button>
                        ))}
                    </div>
                </div>
            )}
            <style jsx>{`
                .ss { position: relative; }
                .ss-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: 8px; color: var(--text-primary); cursor: pointer; font-family: inherit; font-size: 14px; }
                .ss-val { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .ss-ph { color: var(--text-muted); }
                .ss-menu { position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; min-width: 100%; background: #14142b; border: 1px solid var(--border-glass); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); padding: 6px; }
                .ss-search { display: flex; align-items: center; gap: 8px; padding: 6px 9px; border: 1px solid var(--border-glass); border-radius: 6px; margin-bottom: 6px; }
                .ss-search input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-family: inherit; font-size: 13px; min-width: 0; }
                .ss-list { max-height: 280px; overflow-y: auto; }
                .ss-opt { display: block; width: 100%; text-align: left; padding: 8px 9px; border: none; background: none; border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: inherit; }
                .ss-opt:hover { background: rgba(255,255,255,0.06); }
                .ss-opt.sel { background: rgba(99,102,241,0.18); color: var(--text-primary); }
                .ss-empty { padding: 8px; color: var(--text-muted); font-size: 13px; }
            `}</style>
        </div>
    )
}

// Card "Balanço da Obra" (medida Margem de Contribuição).
// Saldo = Receita (Total Recebido Real) - Despesa (Total Pago + Controle Financeiro Saída).
// Verde + animação "breathe" se >= 0; vermelho + "shake" se < 0.
function BalancoCard({ receita, despesa }: { receita: number; despesa: number }) {
    const saldo = receita - despesa
    const positivo = saldo >= 0
    const cor = positivo ? '#00C091' : '#D64550'
    const Icone = positivo ? CheckCircle2 : AlertCircle
    const anim = positivo ? 'breathe' : 'shake'
    return (
        <div className="balanco-card">
            <div className="balanco-head">
                <span className={`balanco-icone ${anim}`}><Icone size={34} color={cor} /></span>
                <span className="balanco-titulo">Balanço da Obra</span>
            </div>
            <div className="balanco-saldo" style={{ color: cor }}>{brlExato(saldo)}</div>
            <div className="balanco-divider" />
            <div className="balanco-detalhes">
                <div>
                    <div className="balanco-label">ENTRADAS (MEDIDO)</div>
                    <div className="balanco-valor">{brlExato(receita)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="balanco-label">SAÍDAS (PAGO)</div>
                    <div className="balanco-valor">{brlExato(despesa)}</div>
                </div>
            </div>
            <style jsx>{`
                .balanco-card {
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
                    padding: 22px 24px;
                }
                .balanco-head { display: flex; align-items: center; gap: 12px; }
                .balanco-icone { display: inline-flex; transform-origin: center; }
                .balanco-icone.breathe { animation: breathe 3s infinite ease-in-out; }
                .balanco-icone.shake { animation: shake .4s infinite ease-in-out; }
                .balanco-titulo { font-size: 14px; font-weight: 700; color: #737373; }
                .balanco-saldo { font-size: 32px; font-weight: 800; margin: 10px 0 16px; line-height: 1.1; }
                .balanco-divider { height: 1px; background: #e0e0e0; margin-bottom: 14px; }
                .balanco-detalhes { display: flex; justify-content: space-between; gap: 16px; }
                .balanco-label { font-size: 11px; letter-spacing: .04em; color: #737373; margin-bottom: 4px; }
                .balanco-valor { font-size: 15px; font-weight: 700; color: #262626; }
                @keyframes breathe {
                    0% { transform: scale(1); opacity: .8; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: .8; }
                }
                @keyframes shake {
                    0% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    50% { transform: translateX(5px); }
                    75% { transform: translateX(-5px); }
                    100% { transform: translateX(0); }
                }
            `}</style>
        </div>
    )
}

// Gráfico de linhas: Total Recebido Real x Total Comprometido Obra por mês.
// Tem filtro de ano PRÓPRIO (independente do filtro do topo), default 2026.
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
function GraficoEvolucao({ recebido, pago }: { recebido: RecebidoRow[]; pago: PagoRow[] }) {
    const anosDisp = useMemo(() => {
        const s = new Set<string>(['2026'])
        recebido.forEach(r => { if (r.data_rec) s.add(r.data_rec.slice(0, 4)) })
        pago.forEach(p => { if (p.data_movimento) s.add(p.data_movimento.slice(0, 4)) })
        return Array.from(s).filter(Boolean).sort((a, b) => b.localeCompare(a))
    }, [recebido, pago])

    const [ano, setAno] = useState('2026')

    const data = useMemo(() => {
        const meses = MESES_ABREV.map(m => ({ mes: m, recebido: 0, comprometido: 0 }))
        for (const r of recebido) {
            if (!r.data_rec || r.data_rec.slice(0, 4) !== ano) continue
            meses[parseInt(r.data_rec.slice(5, 7)) - 1].recebido += Number(r.tot_conf || 0)
        }
        for (const p of pago) {
            if (!p.data_movimento || p.data_movimento.slice(0, 4) !== ano) continue
            const i = parseInt(p.data_movimento.slice(5, 7)) - 1
            if (p.tipo_controle === 'Despesas') meses[i].comprometido += Number(p.vlr_at_pago || 0) + Number(p.vlr_at_pagar || 0)
            else if (p.tipo_controle === 'DespSaida') meses[i].comprometido += Number(p.total_receita || 0)
        }
        return meses.map(m => ({ ...m, diferenca: m.recebido - m.comprometido }))
    }, [recebido, pago, ano])

    return (
        <div className="ge-card">
            <div className="ge-head">
                <h3 className="ge-title">Total Recebido Real e Total Comprometido Obra</h3>
                <select value={ano} onChange={e => setAno(e.target.value)} className="ge-ano">
                    {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
            <div className="ge-legend">
                <span><i style={{ background: '#3aa0e3' }} /> Total Recebido Real</span>
                <span><i style={{ background: '#16308f' }} /> Total Comprometido Obra</span>
            </div>
            <div className="ge-chart">
            <ResponsiveContainer width="100%" height="100%">
                <RLineChart data={data} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: '#737373', fontSize: 9 }} axisLine={{ stroke: '#e0e0e0' }} tickLine={false} dy={4} interval={0} />
                    <YAxis tick={{ fill: '#737373', fontSize: 9 }} axisLine={false} tickLine={false} width={58} tickFormatter={brlCurto} />
                    <Tooltip
                        isAnimationActive={false}
                        content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload as { recebido: number; comprometido: number; diferenca: number }
                            return (
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
                                    <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#262626' }}>{label}</p>
                                    <p style={{ margin: '2px 0', color: '#16308f' }}>Total Comprometido Obra: <strong>{formatCurrency(d.comprometido)}</strong></p>
                                    <p style={{ margin: '2px 0', color: '#3aa0e3' }}>Total Recebido Real: <strong>{formatCurrency(d.recebido)}</strong></p>
                                    <p style={{ margin: '6px 0 0', paddingTop: 6, borderTop: '1px dashed #e5e7eb', color: d.diferenca >= 0 ? '#0a8f5b' : '#c0392b', fontWeight: 600 }}>
                                        Diferença (Receb. − Compr.): {formatCurrency(d.diferenca)}
                                    </p>
                                </div>
                            )
                        }}
                    />
                    <Line type="monotone" dataKey="recebido" stroke="#3aa0e3" strokeWidth={3} dot={{ r: 4, fill: '#3aa0e3' }} />
                    <Line type="monotone" dataKey="comprometido" stroke="#16308f" strokeWidth={3} dot={{ r: 4, fill: '#16308f' }} />
                </RLineChart>
            </ResponsiveContainer>
            </div>
            <style jsx>{`
                .ge-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(15,23,42,.12); padding: 14px 16px; font-family: 'Segoe UI', system-ui, sans-serif; height: 520px; display: flex; flex-direction: column; }
                .ge-chart { flex: 1; min-height: 0; }
                .ge-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
                .ge-title { margin: 0; font-size: 12.5px; font-weight: 700; color: #262626; }
                .ge-ano { padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-weight: 600; color: #1e293b; background: #fff; cursor: pointer; }
                .ge-legend { display: flex; gap: 14px; margin: 8px 0 4px; }
                .ge-legend span { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: #555; font-weight: 500; }
                .ge-legend i { width: 12px; height: 3px; border-radius: 2px; display: inline-block; }
            `}</style>
        </div>
    )
}

// Tabela de pagamentos no estilo HTML limpo (header/rodapé fixos), com colunas
// ordenáveis (clique no cabeçalho alterna maior↔menor). Usada para Insumos e Clientes.
function TabelaPagamentos({ colLabel, linhas, onClickLinha, selecionada, ordemInicial = 'pago' }: {
    colLabel: string
    linhas: LinhaPag[]
    onClickLinha?: (chave: string) => void
    selecionada?: string | null
    ordemInicial?: 'label' | 'aPagar' | 'pago'
}) {
    const [sortCol, setSortCol] = useState<'label' | 'aPagar' | 'pago'>(ordemInicial)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    const ordenadas = useMemo(() => {
        const arr = [...linhas]
        arr.sort((a, b) => {
            const cmp = sortCol === 'label' ? a.label.localeCompare(b.label) : (a[sortCol] as number) - (b[sortCol] as number)
            return sortDir === 'asc' ? cmp : -cmp
        })
        return arr
    }, [linhas, sortCol, sortDir])

    const totalAPagar = linhas.reduce((s, l) => s + l.aPagar, 0)
    const totalPago = linhas.reduce((s, l) => s + l.pago, 0)

    const clickHeader = (col: 'label' | 'aPagar' | 'pago') => {
        if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        else { setSortCol(col); setSortDir('desc') }
    }
    const seta = (col: 'label' | 'aPagar' | 'pago') => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

    return (
        <div className="tp-wrapper">
            <table className="tp-table">
                <thead>
                    <tr>
                        <th className="tp-th" onClick={() => clickHeader('label')}>{colLabel}{seta('label')}</th>
                        <th className="tp-th tp-dir" onClick={() => clickHeader('aPagar')}>TOTAL A PAGAR{seta('aPagar')}</th>
                        <th className="tp-th tp-dir" onClick={() => clickHeader('pago')}>TOTAL PAGO{seta('pago')}</th>
                    </tr>
                </thead>
                <tbody>
                    {ordenadas.length === 0 ? (
                        <tr><td colSpan={3} className="tp-vazio">Sem dados.</td></tr>
                    ) : ordenadas.map(l => (
                        <tr key={l.chave}
                            onClick={onClickLinha ? () => onClickLinha(l.chave) : undefined}
                            className={`${onClickLinha ? 'tp-click' : ''}${selecionada === l.chave ? ' tp-sel' : ''}`}>
                            <td>{l.label}</td>
                            <td className="tp-dir">{brlExato(l.aPagar)}</td>
                            <td className="tp-dir">{brlExato(l.pago)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td>SOMA TOTAL</td>
                        <td className="tp-dir">{brlExato(totalAPagar)}</td>
                        <td className="tp-dir">{brlExato(totalPago)}</td>
                    </tr>
                </tfoot>
            </table>
            <style jsx>{`
                .tp-wrapper { width: 100%; max-height: 520px; overflow-y: auto; background: #F4F4F4; border-radius: 8px; box-shadow: 0 1px 3px rgba(15,23,42,.12); }
                .tp-table { width: 100%; border-collapse: collapse; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; color: #222222; }
                .tp-table thead th { background: #FFFFFF; position: sticky; top: 0; z-index: 10; text-align: left; padding: 16px 15px; font-size: 11px; color: #4F738E; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer; user-select: none; white-space: nowrap; }
                .tp-table tfoot td { background: #FFFFFF; position: sticky; bottom: 0; z-index: 10; font-weight: bold; color: #1E293B; font-size: 14px; padding: 16px 15px; border-top: 2px solid #CBD5E1; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05); }
                .tp-dir { text-align: right; }
                .tp-table tbody td { padding: 14px 15px; border-bottom: 1px solid #EAEAEA; }
                .tp-click { cursor: pointer; }
                .tp-click:hover { background: #eef2f7; }
                .tp-sel { background: #dbe7f3; }
                .tp-sel td { font-weight: 600; }
                .tp-vazio { padding: 16px; color: #888; text-align: center; }
            `}</style>
        </div>
    )
}

// Card "Indicador Evolução" (MEDIÇÃO + FATURAMENTO).
// PorcentagemRealizada = ValorMedido / ValorVenda; barra de fundo (cinza),
// faturado (azul claro = %total), realizado (azul escuro = %realizada).
function IndicadorEvolucao({ valorVenda, valorMedido, valorFaturado }: { valorVenda: number; valorMedido: number; valorFaturado: number }) {
    const clamp = (x: number) => Math.max(0, Math.min(1, x))
    const pctRealizada = valorVenda ? valorMedido / valorVenda : 0
    const pctTotal = valorVenda ? (valorMedido + valorFaturado) / valorVenda : 0
    const saldoFinal = valorVenda - valorMedido - valorFaturado
    const textoPct = (pctRealizada * 100).toFixed(2).replace('.', ',') + '%'

    return (
        <div className="ie-wrap">
            <div className="ie-toprow">
                <span className="ie-title">MEDIÇÃO + FATURAMENTO</span>
                <span className="ie-vgv">VGV: {brlExato(valorVenda)}</span>
            </div>
            <div className="ie-pct">{textoPct}</div>
            <div className="ie-pct-sub">DO CONTRATO REALIZADO</div>
            <div className="ie-bar-bg">
                <div className="ie-bar-fat" style={{ width: `${clamp(pctTotal) * 100}%` }} />
                <div className="ie-bar-real" style={{ width: `${clamp(pctRealizada) * 100}%` }} />
            </div>
            <div className="ie-foot">
                <div>
                    <p className="ie-foot-lbl">REALIZADO</p>
                    <p className="ie-foot-val" style={{ color: '#0072B2' }}>{brlExato(valorMedido)}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p className="ie-foot-lbl">FATURADO</p>
                    <p className="ie-foot-val" style={{ color: '#00A2E8' }}>{brlExato(valorFaturado)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p className="ie-foot-lbl">SALDO FINAL</p>
                    <p className="ie-foot-val" style={{ color: '#A6611A' }}>{brlExato(saldoFinal)}</p>
                </div>
            </div>
            <style jsx>{`
                .ie-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(15,23,42,.12); padding: 18px 20px; font-family: 'Segoe UI', system-ui, sans-serif; }
                .ie-toprow { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
                .ie-title { font-size: 12px; font-weight: 700; color: #0072B2; }
                .ie-vgv { font-size: 12px; font-weight: 700; color: #008000; white-space: nowrap; }
                .ie-pct { font-size: 28px; font-weight: 800; color: #262626; margin-top: 12px; line-height: 1; }
                .ie-pct-sub { font-size: 10px; color: #737373; margin-top: 5px; letter-spacing: .03em; }
                .ie-bar-bg { position: relative; height: 14px; background: #E0E0E0; border-radius: 7px; margin: 16px 0 18px; overflow: hidden; }
                .ie-bar-fat { position: absolute; left: 0; top: 0; height: 14px; background: #A5D8FF; border-radius: 7px; transition: width .4s ease; }
                .ie-bar-real { position: absolute; left: 0; top: 0; height: 14px; background: #0072B2; border-radius: 7px; transition: width .4s ease; }
                .ie-foot { display: flex; justify-content: space-between; gap: 8px; }
                .ie-foot-lbl { margin: 0; font-size: 10px; color: #737373; }
                .ie-foot-val { margin: 3px 0 0; font-size: 13px; font-weight: 700; white-space: nowrap; }
            `}</style>
        </div>
    )
}

// Painel "Próximas Medições" (medida HTML_Recebivel). Header com 3 chips
// (TOTAL valor, NOTAS qtde, VENCIDAS) + lista de A_receber; vencidas (data prevista
// < hoje) ficam em vermelho.
function ProximasMedicoes({ rows }: { rows: AReceberRow[] }) {
    const agora = new Date()
    const hojeISO = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
    const atualizado = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}`

    const totalNotas = rows.length
    const totalValor = rows.reduce((s, r) => s + Number(r.valor_prc || 0), 0)
    const vencidas = rows.filter(r => r.data_fim_contrato_ven && r.data_fim_contrato_ven < hojeISO).length
    const itens = [...rows].sort((a, b) => (a.data_fim_contrato_ven ?? '').localeCompare(b.data_fim_contrato_ven ?? ''))

    return (
        <div className="pm-wrap">
            <div className="pm-titlerow">
                <div>
                    <h2 className="pm-title">Próximas Medições</h2>
                    <p className="pm-sub">Previsão de recebimento</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p className="pm-upd-label">Atualizado</p>
                    <p className="pm-upd-val">{atualizado}</p>
                </div>
            </div>

            <div className="pm-chips">
                <div className="pm-chip pm-chip-total">
                    <p className="pm-chip-label">TOTAL</p>
                    <p className="pm-chip-val">{brlInteiro(totalValor)}</p>
                </div>
                <div className="pm-chip pm-chip-notas">
                    <p className="pm-chip-label">NOTAS</p>
                    <p className="pm-chip-val">{totalNotas}</p>
                </div>
                <div className="pm-chip pm-chip-venc">
                    <p className="pm-chip-label">VENCIDAS</p>
                    <p className="pm-chip-val">{vencidas}</p>
                </div>
            </div>

            <div className="pm-lista">
                {itens.length === 0 ? (
                    <p className="pm-vazio">Nenhuma medição no filtro atual.</p>
                ) : itens.map((r, i) => {
                    const venc = !!r.data_fim_contrato_ven && r.data_fim_contrato_ven < hojeISO
                    return (
                        <div key={i} className={`pm-item${venc ? ' venc' : ''}`}>
                            <div className="pm-item-main">
                                <div className="pm-col-obra">
                                    <span className="pm-ico">{venc ? '🔴' : '✓'}</span>
                                    <div>
                                        <p className="pm-lbl">OBRA</p>
                                        <p className="pm-obra">{r.obra ?? '—'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="pm-lbl">DATA</p>
                                    <p className="pm-data">{ddmmyyyy(r.data_fim_contrato_ven)}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p className="pm-lbl">VALOR</p>
                                    <p className="pm-valor">{brlExato(Number(r.valor_prc || 0))}</p>
                                </div>
                            </div>
                            <div className="pm-hist">
                                <p className="pm-lbl pm-hist-lbl">DESCRIÇÃO / NOTA</p>
                                <p className="pm-hist-txt">{r.hist_lanc_ven ?? '—'}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            <style jsx>{`
                .pm-wrap { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 12px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 8px; height: 520px; display: flex; flex-direction: column; box-sizing: border-box; }
                .pm-titlerow { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
                .pm-title { margin: 0; font-size: 18px; font-weight: 800; color: #1f4788; }
                .pm-sub { margin: 3px 0 0; font-size: 11px; color: #666; }
                .pm-upd-label { margin: 0; font-size: 10px; color: #999; }
                .pm-upd-val { margin: 2px 0 0; font-size: 11px; font-weight: 600; color: #1f4788; }
                .pm-chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
                .pm-chip { padding: 10px; border-radius: 6px; color: #fff; text-align: center; }
                .pm-chip-total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .pm-chip-notas { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
                .pm-chip-venc { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
                .pm-chip-label { margin: 0; font-size: 9px; font-weight: 600; opacity: .9; }
                .pm-chip-val { margin: 4px 0 0; font-size: 14px; font-weight: 800; }
                .pm-lista { margin-top: 10px; flex: 1; min-height: 0; overflow-y: auto; }
                .pm-vazio { font-size: 12px; color: #666; padding: 8px; }
                .pm-item { margin-bottom: 10px; padding: 12px; background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%); border-left: 4px solid #1f4788; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
                .pm-item.venc { background: linear-gradient(135deg, #fff5f5 0%, #fafafa 100%); border-left-color: #ff6b6b; }
                .pm-item-main { display: grid; grid-template-columns: 1.8fr 1.2fr 1.2fr; gap: 12px; align-items: center; }
                .pm-col-obra { display: flex; align-items: center; gap: 8px; }
                .pm-ico { font-size: 14px; }
                .pm-lbl { margin: 0; font-size: 10px; color: #999; font-weight: 500; }
                .pm-obra { margin: 2px 0 0; font-size: 13px; font-weight: 700; color: #1f4788; }
                .pm-data { margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #495057; }
                .pm-valor { margin: 2px 0 0; font-size: 13px; font-weight: 700; color: #1f4788; }
                .pm-item.venc .pm-obra, .pm-item.venc .pm-data, .pm-item.venc .pm-valor { color: #d32f2f; }
                .pm-hist { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #eee; }
                .pm-hist-lbl { color: #aaa; }
                .pm-hist-txt { margin: 2px 0 0; font-size: 11px; color: #666; font-style: italic; line-height: 1.3; }
            `}</style>
        </div>
    )
}

function KpiCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="kpi-white-card">
            <div className="kpi-white-value">{value}</div>
            <div className="kpi-white-label">{label}</div>
            <style jsx>{`
                .kpi-white-card {
                    background: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
                    border: 1px solid #e5e7eb;
                    padding: 14px 12px;
                    aspect-ratio: 1 / 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    gap: 6px;
                    transition: transform .18s ease-out, box-shadow .18s ease-out, border-color .18s ease-out;
                }
                .kpi-white-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 6px 12px rgba(15, 23, 42, 0.18);
                    border-color: #cbd5f5;
                }
                .kpi-white-value {
                    font-size: 18px;
                    font-weight: 700;
                    color: #111827;
                    line-height: 1.2;
                }
                .kpi-white-label {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: .08em;
                    color: #6b7280;
                    font-weight: 600;
                }
            `}</style>
        </div>
    )
}
