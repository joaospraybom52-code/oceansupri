'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PedidoCompra, StatusFSM } from '@/lib/types/database'
import { STATUS_LABELS, STATUS_COLORS, STATUS_ORDER, formatCurrency, calcSavingAbsoluto, calcSavingPercentual, calcLeadTimeDays, formatPercent } from '@/lib/utils/kpi-calculations'
import { formatDate, formatDateTime, timeAgo } from '@/lib/utils/date-helpers'
import { X, Calendar, TrendingDown, Clock, CheckCircle, Package, Building2, User, Trash2 } from 'lucide-react'

interface PedidoModalProps {
    pedido: PedidoCompra
    pedidosGroup?: PedidoCompra[]
    onClose: () => void
    onUpdate: (updated: PedidoCompra, allUpdated?: PedidoCompra[]) => void
    onDelete?: (id: string) => void
}

function getInitialSum(pedido: PedidoCompra, pedidosGroup: PedidoCompra[] | undefined, field: keyof PedidoCompra) {
    if (pedidosGroup && pedidosGroup.length > 0) {
        const sum = pedidosGroup.reduce((acc, p) => acc + (Number(p[field]) || 0), 0);
        return sum > 0 ? sum.toString() : '';
    }
    const val = pedido[field];
    return val != null ? val.toString() : '';
}

export default function PedidoModal({ pedido, pedidosGroup, onClose, onUpdate, onDelete }: PedidoModalProps) {
    const [dataPrevisao, setDataPrevisao] = useState(pedido.data_previsao_entrega || '')
    const [dataEntregaReal, setDataEntregaReal] = useState(pedido.data_entrega_real || '')
    const [valorOrcado, setValorOrcado] = useState(getInitialSum(pedido, pedidosGroup, 'valor_orcado'))
    const [valorFechado, setValorFechado] = useState(getInitialSum(pedido, pedidosGroup, 'valor_fechado'))
    const [valorFrete, setValorFrete] = useState(getInitialSum(pedido, pedidosGroup, 'valor_frete'))
    const [dataSaiuEntrega, setDataSaiuEntrega] = useState(pedido.data_saiu_entrega?.split('T')[0] || '')
    const [categoriaCap, setCategoriaCap] = useState(pedido.categoria_cap || '')
    const [numeroPedido, setNumeroPedido] = useState(pedido.numero_pedido || '')
    const [codigoUau, setCodigoUau] = useState(pedido.codigo_uau || '')
    const [numeroOrdemCompra, setNumeroOrdemCompra] = useState(pedido.numero_ordem_compra || '')
    const [fornecedor1Id, setFornecedor1Id] = useState(pedido.fornecedor_1_id || '')
    const [fornecedor1Orcado, setFornecedor1Orcado] = useState(getInitialSum(pedido, pedidosGroup, 'fornecedor_1_valor_orcado'))
    const [fornecedor1Negociado, setFornecedor1Negociado] = useState(getInitialSum(pedido, pedidosGroup, 'fornecedor_1_valor_negociado'))
    const [fornecedor2Id, setFornecedor2Id] = useState(pedido.fornecedor_2_id || '')
    const [fornecedor2Orcado, setFornecedor2Orcado] = useState(getInitialSum(pedido, pedidosGroup, 'fornecedor_2_valor_orcado'))
    const [fornecedor2Negociado, setFornecedor2Negociado] = useState(getInitialSum(pedido, pedidosGroup, 'fornecedor_2_valor_negociado'))
    const [fornecedor3Id, setFornecedor3Id] = useState(pedido.fornecedor_3_id || '')
    const [fornecedor3Orcado, setFornecedor3Orcado] = useState(getInitialSum(pedido, pedidosGroup, 'fornecedor_3_valor_orcado'))
    const [fornecedor3Negociado, setFornecedor3Negociado] = useState(getInitialSum(pedido, pedidosGroup, 'fornecedor_3_valor_negociado'))
    const [fornecedorVencedor, setFornecedorVencedor] = useState<number | null>(pedido.fornecedor_vencedor || null)
    const [justificativa, setJustificativa] = useState(pedido.justificativa_fornecedor || '')
    const [fornecedores, setFornecedores] = useState<{ id: string, razao_social: string }[]>([])
    const [compradores, setCompradores] = useState<{ id: string, nome: string, email: string | null }[]>([])
    const [compradorId, setCompradorId] = useState(pedido.comprador_id || '')
    const [saving, setSaving] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const supabase = createClient()
    useEffect(() => {
        async function loadFornecedores() {
            const { data } = await supabase.from('fornecedores').select('id, razao_social').order('razao_social')
            if (data) setFornecedores(data)
        }
        async function loadCompradores() {
            const { data } = await supabase.from('compradores').select('id, nome, email').order('nome')
            if (data) {
                setCompradores(data)

                // Auto-select logged-in user if not already set
                if (!pedido.comprador_id) {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user && user.email) {
                        const loggedInComprador = data.find(c => c.email === user.email)
                        if (loggedInComprador) {
                            setCompradorId(loggedInComprador.id)
                        }
                    }
                }
            }
        }
        loadFornecedores()
        loadCompradores()
    }, [])

    function handleSelectWinner(winnerId: number) {
        setFornecedorVencedor(winnerId);
        if (winnerId === 1) {
            if (fornecedor1Orcado) setValorOrcado(fornecedor1Orcado);
            if (fornecedor1Negociado) setValorFechado(fornecedor1Negociado);
        } else if (winnerId === 2) {
            if (fornecedor2Orcado) setValorOrcado(fornecedor2Orcado);
            if (fornecedor2Negociado) setValorFechado(fornecedor2Negociado);
        } else if (winnerId === 3) {
            if (fornecedor3Orcado) setValorOrcado(fornecedor3Orcado);
            if (fornecedor3Negociado) setValorFechado(fornecedor3Negociado);
        }
    }

    const totalOrcadoDisplay = Number(valorOrcado) || 0
    const totalFechadoDisplay = Number(valorFechado) || 0
    const savingAbs = calcSavingAbsoluto(totalOrcadoDisplay, totalFechadoDisplay)
    const savingPct = calcSavingPercentual(totalOrcadoDisplay, totalFechadoDisplay)
    const leadTimeTotal = calcLeadTimeDays(pedido.data_requisicao, pedido.data_entrega_real)

    const timestampFields: { key: keyof PedidoCompra; label: string }[] = [
        { key: 'data_requisicao', label: 'Requisição' },
        { key: 'data_inicio_cotacao', label: 'Início Cotação' },
        { key: 'data_envio_aprovacao', label: 'Enviado p/ Aprovação' },
        { key: 'data_aprovacao_diretoria', label: 'Aprovado Diretoria' },
        { key: 'data_ordem_compra', label: 'Ordem de Compra' },
        { key: 'data_saiu_entrega', label: 'Saiu p/ Entrega' },
        { key: 'data_previsao_entrega', label: 'Previsão Entrega' },
        { key: 'data_entrega_real', label: 'Entrega Real' },
    ]

    async function handleSave() {
        setSaving(true)
        const updateData: Record<string, unknown> = {}

        if (dataPrevisao) {
            updateData.data_previsao_entrega = dataPrevisao
            if (pedido.status_fsm === 'ordem_gerada' || pedido.status_fsm === 'aprovado') {
                updateData.status_fsm = 'aguardando_entrega'
            }
        }
        if (compradorId !== (pedido.comprador_id || '')) {
            updateData.comprador_id = compradorId || null
        }
        if (dataEntregaReal) {
            updateData.data_entrega_real = dataEntregaReal
            updateData.status_fsm = 'entregue'
        }

        const divisor = (pedidosGroup && pedidosGroup.length > 0) ? pedidosGroup.length : 1

        if (valorOrcado) {
            updateData.valor_orcado = parseFloat(valorOrcado) / divisor
        }
        if (valorFechado) {
            const vf = parseFloat(valorFechado) / divisor
            updateData.valor_fechado = vf

            const vo = valorOrcado ? parseFloat(valorOrcado) / divisor : pedido.valor_orcado
            if (vo) {
                updateData.desconto_absoluto = vo - vf
                updateData.desconto_percentual = ((vo - vf) / vo) * 100
            }
        }

        if (['em_transito', 'aguardando_entrega', 'entregue'].includes(pedido.status_fsm || '')) {
            updateData.data_saiu_entrega = dataSaiuEntrega ? new Date(dataSaiuEntrega).toISOString() : null
        }

        updateData.fornecedor_1_id = fornecedor1Id || null
        updateData.fornecedor_1_valor_orcado = fornecedor1Orcado ? parseFloat(fornecedor1Orcado) / divisor : null
        updateData.fornecedor_1_valor_negociado = fornecedor1Negociado ? parseFloat(fornecedor1Negociado) / divisor : null
        updateData.fornecedor_2_id = fornecedor2Id || null
        updateData.fornecedor_2_valor_orcado = fornecedor2Orcado ? parseFloat(fornecedor2Orcado) / divisor : null
        updateData.fornecedor_2_valor_negociado = fornecedor2Negociado ? parseFloat(fornecedor2Negociado) / divisor : null
        updateData.fornecedor_3_id = fornecedor3Id || null
        updateData.fornecedor_3_valor_orcado = fornecedor3Orcado ? parseFloat(fornecedor3Orcado) / divisor : null
        updateData.fornecedor_3_valor_negociado = fornecedor3Negociado ? parseFloat(fornecedor3Negociado) / divisor : null
        updateData.fornecedor_vencedor = fornecedorVencedor
        updateData.justificativa_fornecedor = justificativa || null
        updateData.valor_frete = valorFrete ? parseFloat(valorFrete) / divisor : null
        updateData.categoria_cap = categoriaCap || null
        updateData.numero_pedido = numeroPedido || null
        updateData.codigo_uau = codigoUau || null
        updateData.numero_ordem_compra = numeroOrdemCompra || null

        if (Object.keys(updateData).length > 0) {
            let query = supabase.from('pedidos_compra').update(updateData)

            if (pedido.grupo_cotacao_id) {
                query = query.eq('grupo_cotacao_id', pedido.grupo_cotacao_id)
            } else {
                query = query.eq('id', pedido.id)
            }

            const { data } = await query.select('*, obra:obras(*), comprador:compradores(*)')

            // Trigger onUpdate with all updated items so the board updates grouped cards perfectly
            if (data && data.length > 0) {
                const updatedMain = data.find((p: any) => p.id === pedido.id) || data[0]
                onUpdate(updatedMain as unknown as PedidoCompra, data as unknown as PedidoCompra[])
            }
        }
        setSaving(false)
    }

    async function executeDelete() {
        setSaving(true)
        let query = supabase.from('pedidos_compra').delete()
        if (pedido.grupo_cotacao_id) {
            query = query.eq('grupo_cotacao_id', pedido.grupo_cotacao_id)
        } else {
            query = query.eq('id', pedido.id)
        }

        const { error } = await query

        setSaving(false)
        if (error) {
            console.error('Delete error:', error)
            setConfirmingDelete(false)
            return
        }
        if (onDelete) onDelete(pedido.id)
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span className="badge" style={{ background: `${STATUS_COLORS[pedido.status_fsm || 'requisitado']}20`, color: STATUS_COLORS[pedido.status_fsm || 'requisitado'] }}>
                                {STATUS_LABELS[pedido.status_fsm || 'requisitado']}
                            </span>
                            {pedido.emergencial && (
                                <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red-light)' }}>Urgente</span>
                            )}
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                            {pedidosGroup && pedidosGroup.length > 1
                                ? `Múltiplos Insumos (${pedidosGroup.length} itens)`
                                : pedido.descricao_insumo}
                        </h2>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Pedido #{pedidosGroup && pedidosGroup.length > 1
                                ? pedidosGroup.map(p => p.numero_pedido).filter(Boolean).join('\n')
                                : (pedido.numero_pedido || '—')}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => setConfirmingDelete(true)} title="Excluir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)' }}>
                            <Trash2 size={20} />
                        </button>
                        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Banner */}
                {confirmingDelete && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
                        borderRadius: 'var(--radius-sm)', padding: '14px 18px', marginBottom: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
                    }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-red-light)' }}>
                            Tem certeza que deseja excluir este pedido?
                        </span>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={() => setConfirmingDelete(false)}
                                style={{
                                    padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                                    border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-glass)', color: 'var(--text-secondary)',
                                    cursor: 'pointer', fontFamily: 'Inter'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={executeDelete}
                                disabled={saving}
                                style={{
                                    padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                                    border: 'none', borderRadius: 'var(--radius-sm)',
                                    background: 'var(--accent-red)', color: 'white',
                                    cursor: 'pointer', fontFamily: 'Inter'
                                }}
                            >
                                {saving ? 'Excluindo...' : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Info Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <Building2 size={16} style={{ color: 'var(--accent-blue)' }} />
                        <div>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Obra</p>
                            <p style={{ fontSize: '13px', fontWeight: 600 }}>{pedido.obra?.nome || 'Não informada'}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <User size={16} style={{ color: 'var(--accent-green)' }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Comprador Responsável</p>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {compradores.find(c => c.id === compradorId)?.nome || 'Sem Comprador'}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <User size={16} style={{ color: 'var(--accent-purple)' }} />
                        <div>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Solicitante na Obra</p>
                            <p style={{ fontSize: '13px', fontWeight: 600 }}>{pedido.solicitante_obra || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Additional Information (Cotação / Pedido) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Nº Cotação</p>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{categoriaCap || '—'}</p>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Nº Pedido (Sistema UAU)</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                            {pedidosGroup && pedidosGroup.length > 1
                                ? pedidosGroup.map(p => p.numero_pedido).filter(Boolean).join(', ')
                                : (numeroPedido || '—')}
                        </p>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CÓDIGO DA OBRA</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                            {pedidosGroup && pedidosGroup.length > 1
                                ? pedidosGroup.map(p => p.codigo_uau).filter(Boolean).join(', ')
                                : (codigoUau || '—')}
                        </p>
                    </div>
                    <div style={{ padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Nº Ordem de Compra</p>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{numeroOrdemCompra || '—'}</p>
                    </div>
                </div>

                {/* Financial */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Valor Orçado</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalOrcadoDisplay > 0 ? formatCurrency(totalOrcadoDisplay) : '—'}</p>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Valor Fechado</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-blue)' }}>{totalFechadoDisplay > 0 ? formatCurrency(totalFechadoDisplay) : '—'}</p>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Saving</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-green)' }}>
                            {savingAbs !== null ? formatCurrency(savingAbs) : '—'}
                            {savingPct !== null && <span style={{ fontSize: '11px', marginLeft: '4px' }}>({formatPercent(savingPct)})</span>}
                        </p>
                    </div>
                </div>

                {/* Timeline - State Transitions */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} /> Histórico de Transições
                        {leadTimeTotal !== null && (
                            <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500, marginLeft: 'auto' }}>
                                Lead Time Total: {leadTimeTotal} dias
                            </span>
                        )}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {timestampFields.map(({ key, label }) => {
                            const value = pedido[key] as string | null
                            const isSet = !!value
                            return (
                                <div key={key} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                                    background: isSet ? 'rgba(16,185,129,0.05)' : 'transparent',
                                }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: isSet ? 'var(--accent-green)' : 'var(--text-muted)',
                                        opacity: isSet ? 1 : 0.3,
                                        flexShrink: 0
                                    }} />
                                    <span style={{ fontSize: '12px', color: isSet ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 500, width: '140px' }}>
                                        {label}
                                    </span>
                                    <span style={{ fontSize: '12px', color: isSet ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                                        {value ? formatDateTime(value) : 'Pendente'}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Editable fields */}
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Atualizar Dados</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '26px' }}>Nº Cotação</label>
                            <input
                                type="text"
                                value={categoriaCap}
                                onChange={(e) => setCategoriaCap(e.target.value)}
                                className="input-field"
                                placeholder="Nº Cotação"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '26px' }}>Nº Pedido (UAU)</label>
                            <input
                                type="text"
                                value={numeroPedido}
                                onChange={(e) => setNumeroPedido(e.target.value)}
                                className="input-field"
                                placeholder="Nº Pedido"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '26px' }}>Código da Obra</label>
                            <input
                                type="text"
                                value={codigoUau}
                                onChange={(e) => setCodigoUau(e.target.value)}
                                className="input-field"
                                placeholder="Cód. Obra"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '26px' }}>Nº Ordem Compra</label>
                            <input
                                type="text"
                                value={numeroOrdemCompra}
                                onChange={(e) => setNumeroOrdemCompra(e.target.value)}
                                className="input-field"
                                placeholder="Nº OP"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '26px' }}>Valor Orçado (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={valorOrcado}
                                onChange={(e) => setValorOrcado(e.target.value)}
                                className="input-field"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '26px' }}>Valor Fechado (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={valorFechado}
                                onChange={(e) => setValorFechado(e.target.value)}
                                className="input-field"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '26px' }}>Valor do Frete (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={valorFrete}
                                onChange={(e) => setValorFrete(e.target.value)}
                                className="input-field"
                                placeholder="0,00"
                            />
                        </div>
                        {['ordem_gerada', 'em_transito', 'aguardando_entrega', 'entregue'].includes(pedido.status_fsm || '') && (
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Previsão Entrega</label>
                                <input
                                    type="date"
                                    value={dataPrevisao}
                                    onChange={(e) => setDataPrevisao(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                        )}
                        {['em_transito', 'aguardando_entrega', 'entregue'].includes(pedido.status_fsm || '') && (
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Saiu para Entrega</label>
                                <input
                                    type="date"
                                    value={dataSaiuEntrega}
                                    onChange={(e) => setDataSaiuEntrega(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                        )}
                        {pedido.status_fsm === 'entregue' && (
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Entrega Real</label>
                                <input
                                    type="date"
                                    value={dataEntregaReal}
                                    onChange={(e) => setDataEntregaReal(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                        {/* Fornecedor 1 */}
                        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Fornecedor 1</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <input type="radio" name="fornecedor_vencedor" checked={fornecedorVencedor === 1} onChange={() => handleSelectWinner(1)} /> Vencedor
                                </label>
                            </div>
                            <select value={fornecedor1Id} onChange={(e) => setFornecedor1Id(e.target.value)} className="input-field" style={{ marginBottom: '8px' }}>
                                <option value="">Selecione...</option>
                                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
                            </select>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '22px' }}>Valor Orçado (R$)</label>
                                    <input type="number" step="0.01" value={fornecedor1Orcado} onChange={(e) => setFornecedor1Orcado(e.target.value)} className="input-field" placeholder="0,00" style={{ fontSize: '12px', padding: '6px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '22px' }}>Valor Negociado (R$)</label>
                                    <input type="number" step="0.01" value={fornecedor1Negociado} onChange={(e) => setFornecedor1Negociado(e.target.value)} className="input-field" placeholder="0,00" style={{ fontSize: '12px', padding: '6px' }} />
                                </div>
                            </div>
                        </div>

                        {/* Fornecedor 2 */}
                        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Fornecedor 2</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <input type="radio" name="fornecedor_vencedor" checked={fornecedorVencedor === 2} onChange={() => handleSelectWinner(2)} /> Vencedor
                                </label>
                            </div>
                            <select value={fornecedor2Id} onChange={(e) => setFornecedor2Id(e.target.value)} className="input-field" style={{ marginBottom: '8px' }}>
                                <option value="">Selecione...</option>
                                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
                            </select>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '22px' }}>Valor Orçado (R$)</label>
                                    <input type="number" step="0.01" value={fornecedor2Orcado} onChange={(e) => setFornecedor2Orcado(e.target.value)} className="input-field" placeholder="0,00" style={{ fontSize: '12px', padding: '6px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '22px' }}>Valor Negociado (R$)</label>
                                    <input type="number" step="0.01" value={fornecedor2Negociado} onChange={(e) => setFornecedor2Negociado(e.target.value)} className="input-field" placeholder="0,00" style={{ fontSize: '12px', padding: '6px' }} />
                                </div>
                            </div>
                        </div>

                        {/* Fornecedor 3 */}
                        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Fornecedor 3</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <input type="radio" name="fornecedor_vencedor" checked={fornecedorVencedor === 3} onChange={() => handleSelectWinner(3)} /> Vencedor
                                </label>
                            </div>
                            <select value={fornecedor3Id} onChange={(e) => setFornecedor3Id(e.target.value)} className="input-field" style={{ marginBottom: '8px' }}>
                                <option value="">Selecione...</option>
                                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
                            </select>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '22px' }}>Valor Orçado (R$)</label>
                                    <input type="number" step="0.01" value={fornecedor3Orcado} onChange={(e) => setFornecedor3Orcado(e.target.value)} className="input-field" placeholder="0,00" style={{ fontSize: '12px', padding: '6px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', minHeight: '22px' }}>Valor Negociado (R$)</label>
                                    <input type="number" step="0.01" value={fornecedor3Negociado} onChange={(e) => setFornecedor3Negociado(e.target.value)} className="input-field" placeholder="0,00" style={{ fontSize: '12px', padding: '6px' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Justificativa de Escolha</label>
                        <textarea
                            value={justificativa}
                            onChange={(e) => setJustificativa(e.target.value)}
                            className="input-field"
                            placeholder="Descreva por que este fornecedor foi escolhido..."
                            style={{ minHeight: '60px', resize: 'vertical' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={16} />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
