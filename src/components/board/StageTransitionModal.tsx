'use client'

import { useState } from 'react'
import { PedidoCompra, StatusFSM } from '@/lib/types/database'
import { X, Check } from 'lucide-react'

interface StageTransitionModalProps {
    pedido: PedidoCompra
    newStatus: StatusFSM
    onClose: () => void
    onConfirm: (updateData: Record<string, any>) => void
}

export default function StageTransitionModal({ pedido, newStatus, onClose, onConfirm }: StageTransitionModalProps) {
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState<Record<string, any>>({
        categoria_cap: pedido.categoria_cap || '',
        valor_orcado: pedido.valor_orcado?.toString() || '',
        valor_fechado: pedido.valor_fechado?.toString() || '',
        numero_ordem_compra: pedido.numero_ordem_compra || '',
        data_saiu_entrega: pedido.data_saiu_entrega ? pedido.data_saiu_entrega.split('T')[0] : new Date().toISOString().split('T')[0],
        data_previsao_entrega: pedido.data_previsao_entrega ? pedido.data_previsao_entrega.split('T')[0] : '',
        data_entrega_real: pedido.data_entrega_real ? pedido.data_entrega_real.split('T')[0] : new Date().toISOString().split('T')[0],
        diretor_aprovou: !!pedido.data_aprovacao_diretoria
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)

        const updateData: Record<string, any> = { status_fsm: newStatus }

        if (newStatus === 'em_cotacao') {
            updateData.categoria_cap = formData.categoria_cap || null
            if (!pedido.data_inicio_cotacao) {
                updateData.data_inicio_cotacao = new Date().toISOString()
            }
        }
        else if (newStatus === 'aguardando_aprovacao') {
            updateData.valor_orcado = formData.valor_orcado ? parseFloat(formData.valor_orcado) : null
            updateData.valor_fechado = formData.valor_fechado ? parseFloat(formData.valor_fechado) : null
            if (!pedido.data_envio_aprovacao) {
                updateData.data_envio_aprovacao = new Date().toISOString()
            }
        }
        else if (newStatus === 'aprovado') {
            if (!pedido.data_aprovacao_diretoria) {
                updateData.data_aprovacao_diretoria = new Date().toISOString()
            }
        }
        else if (newStatus === 'ordem_gerada') {
            updateData.numero_ordem_compra = formData.numero_ordem_compra || null
            updateData.data_previsao_entrega = formData.data_previsao_entrega || null
            if (!pedido.data_ordem_compra) {
                updateData.data_ordem_compra = new Date().toISOString()
            }
            if (formData.diretor_aprovou && !pedido.data_aprovacao_diretoria) {
                updateData.data_aprovacao_diretoria = new Date().toISOString()
            }
        }
        else if (newStatus === 'em_transito') {
            updateData.data_saiu_entrega = formData.data_saiu_entrega ? new Date(formData.data_saiu_entrega).toISOString() : null
        }
        else if (newStatus === 'entregue') {
            updateData.data_entrega_real = formData.data_entrega_real || null
            if (pedido.valor_fechado && pedido.valor_orcado) {
                // update discount calcs on delivery just in case
                updateData.desconto_absoluto = pedido.valor_orcado - pedido.valor_fechado
                updateData.desconto_percentual = ((pedido.valor_orcado - pedido.valor_fechado) / pedido.valor_orcado) * 100
            }
        }

        onConfirm(updateData)
    }

    const titles: Record<StatusFSM, string> = {
        requisitado: 'Mover para Requisitado',
        em_cotacao: 'Colocar Em Cotação',
        aguardando_aprovacao: 'Enviar para Aprovação',
        aprovado: 'Aprovar Compra',
        ordem_gerada: 'Gerar Ordem de Compra',
        em_transito: 'Saiu para Entrega',
        aguardando_entrega: 'Mover para Recebimento',
        entregue: 'Confirmar Entrega'
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{titles[newStatus]}</h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    <strong>{pedido.descricao_insumo}</strong>
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Campos para Em Cotação (Entrada na coluna) */}
                    {newStatus === 'em_cotacao' && (
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Nº Cotação (OPCIONAL)</label>
                            <input
                                type="text"
                                value={formData.categoria_cap}
                                onChange={(e) => setFormData({ ...formData, categoria_cap: e.target.value })}
                                className="input-field"
                                placeholder="Ex: 12345"
                            />
                        </div>
                    )}

                    {/* Campos para Aguardando Aprovação (saída de cotação) */}
                    {newStatus === 'aguardando_aprovacao' && (
                        <>
                            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                    Para enviar para aprovação, por favor, insira o valor orçado e o final negociado.
                                </p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Valor Orçado (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.valor_orcado}
                                        onChange={(e) => setFormData({ ...formData, valor_orcado: e.target.value })}
                                        className="input-field"
                                        placeholder="0,00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Valor Fechado (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.valor_fechado}
                                        onChange={(e) => setFormData({ ...formData, valor_fechado: e.target.value })}
                                        className="input-field"
                                        placeholder="0,00"
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Campos para Aprovado / OC */}
                    {newStatus === 'ordem_gerada' && (
                        <>
                            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        required
                                        checked={formData.diretor_aprovou}
                                        onChange={(e) => setFormData({ ...formData, diretor_aprovou: e.target.checked })}
                                        style={{ accentColor: 'var(--accent-blue)', width: '16px', height: '16px' }}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        O diretor já aprovou esta compra?
                                    </span>
                                </label>
                            </div>

                            {formData.diretor_aprovou && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', animation: 'fadeIn 0.3s ease-out' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Nº Ordem de Compra *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.numero_ordem_compra}
                                            onChange={(e) => setFormData({ ...formData, numero_ordem_compra: e.target.value })}
                                            className="input-field"
                                            placeholder="Obrigatório"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Previsão de Entrega *</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.data_previsao_entrega}
                                            onChange={(e) => setFormData({ ...formData, data_previsao_entrega: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Campos para Em Trânsito */}
                    {newStatus === 'em_transito' && (
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Data que Saiu para Entrega *</label>
                            <input
                                type="date"
                                required
                                value={formData.data_saiu_entrega}
                                onChange={(e) => setFormData({ ...formData, data_saiu_entrega: e.target.value })}
                                className="input-field"
                            />
                        </div>
                    )}

                    {/* Campos para Entregue */}
                    {newStatus === 'entregue' && (
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Data da Entrega Real *</label>
                            <input
                                type="date"
                                required
                                value={formData.data_entrega_real}
                                onChange={(e) => setFormData({ ...formData, data_entrega_real: e.target.value })}
                                className="input-field"
                            />
                        </div>
                    )}

                    {/* Fallback para colunas sem form específico (como enviando para aprovação simples) */}
                    {(newStatus !== 'aguardando_aprovacao' && newStatus !== 'ordem_gerada' && newStatus !== 'em_transito' && newStatus !== 'entregue') && (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Confirmar a movimentação deste pedido para <strong>{titles[newStatus]}</strong>?
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                        <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Check size={16} />
                            {submitting ? 'Salvando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
