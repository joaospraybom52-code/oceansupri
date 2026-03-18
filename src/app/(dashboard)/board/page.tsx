'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PedidoCompra } from '@/lib/types/database'
import KanbanBoard from '@/components/board/KanbanBoard'
import TimelineView from '@/components/board/TimelineView'
import NovoPedidoForm from '@/components/pedidos/NovoPedidoForm'
import PedidoModal from '@/components/pedidos/PedidoModal'
import { Plus, Kanban, CalendarRange, RefreshCw } from 'lucide-react'

export default function BoardPage() {
    const [pedidos, setPedidos] = useState<PedidoCompra[]>([])
    const [view, setView] = useState<'kanban' | 'timeline'>('kanban')
    const [showNewForm, setShowNewForm] = useState(false)
    const [selectedPedido, setSelectedPedido] = useState<PedidoCompra | null>(null)
    const [obras, setObras] = useState<any[]>([])
    const [filterObraId, setFilterObraId] = useState<string>('all')
    const [filterCotacao, setFilterCotacao] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        loadPedidos()
        loadObras()

        const channel = supabase
            .channel('pedidos-realtime-board')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_compra' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    // Refetch or update state
                    loadPedidos()
                } else if (payload.eventType === 'UPDATE') {
                    setPedidos(prev => prev.map(p => p.id === (payload.new as PedidoCompra).id ? { ...p, ...payload.new } as PedidoCompra : p))
                } else if (payload.eventType === 'DELETE') {
                    setPedidos(prev => prev.filter(p => p.id !== (payload.old as { id: string }).id))
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    async function loadObras() {
        const { data } = await supabase.from('obras').select('id, nome, codigo').order('nome')
        if (data) setObras(data)
    }

    async function loadPedidos() {
        setLoading(true)
        const { data } = await supabase
            .from('pedidos_compra')
            .select('*, obra:obras(*), comprador:compradores(*)')
            .order('created_at', { ascending: false })
        if (data) setPedidos(data as unknown as PedidoCompra[])
        setLoading(false)
    }

    const filteredPedidos = pedidos.filter(p => {
        const matchesObra = filterObraId === 'all' || p.obra_id === filterObraId

        const searchUpper = filterCotacao.toLowerCase()
        const matchesCotacao = !filterCotacao ||
            (p.categoria_cap?.toLowerCase().includes(searchUpper)) ||
            (p.numero_pedido?.toLowerCase().includes(searchUpper)) ||
            (p.codigo_uau?.toLowerCase().includes(searchUpper))

        return matchesObra && matchesCotacao
    })

    // Contagem de cotações únicas (grupos de cotação ou pedidos sem grupo)
    const uniqueCotacoesCount = Array.from(new Set(
        filteredPedidos.map(p => p.grupo_cotacao_id || p.id)
    )).length

    return (
        <div>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Board de Suprimentos</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {uniqueCotacoesCount} cotações • {filteredPedidos.length} itens no total
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flex: 1, padding: '0 40px' }}>
                    <div style={{ display: 'flex', flex: 1, gap: '8px' }}>
                        <select
                            value={filterObraId}
                            onChange={(e) => setFilterObraId(e.target.value)}
                            className="input-field"
                            style={{ maxWidth: '200px' }}
                        >
                            <option value="all">Todas as Obras</option>
                            {obras.map(obra => (
                                <option key={obra.id} value={obra.id}>
                                    {obra.nome} {obra.codigo ? `(${obra.codigo})` : ''}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Buscar por Nº Cotação..."
                            value={filterCotacao}
                            onChange={(e) => setFilterCotacao(e.target.value)}
                            className="input-field"
                            style={{ flex: 1, maxWidth: '300px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* View Toggle */}
                    <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                        <button
                            onClick={() => setView('kanban')}
                            style={{
                                padding: '8px 14px', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '12px', fontWeight: 600, fontFamily: 'Inter',
                                background: view === 'kanban' ? 'var(--accent-blue)' : 'transparent',
                                color: view === 'kanban' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Kanban size={14} /> Kanban
                        </button>
                        <button
                            onClick={() => setView('timeline')}
                            style={{
                                padding: '8px 14px', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '12px', fontWeight: 600, fontFamily: 'Inter',
                                background: view === 'timeline' ? 'var(--accent-blue)' : 'transparent',
                                color: view === 'timeline' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <CalendarRange size={14} /> Timeline
                        </button>
                    </div>

                    <button onClick={loadPedidos} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}>
                        <RefreshCw size={14} />
                    </button>

                    <button onClick={() => setShowNewForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={16} /> Novo Pedido
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : view === 'kanban' ? (
                <KanbanBoard initialPedidos={filteredPedidos} />
            ) : (
                <TimelineView pedidos={filteredPedidos} onSelectPedido={setSelectedPedido} />
            )}

            {showNewForm && (
                <NovoPedidoForm
                    onClose={() => setShowNewForm(false)}
                    onCreated={loadPedidos}
                />
            )}

            {selectedPedido && (
                <PedidoModal
                    pedido={selectedPedido}
                    onClose={() => setSelectedPedido(null)}
                    onUpdate={(updated) => {
                        setPedidos(prev => prev.map(p => p.id === updated.id ? updated : p))
                        setSelectedPedido(updated)
                    }}
                    onDelete={(id) => {
                        setPedidos(prev => prev.filter(p => p.id !== id))
                        setSelectedPedido(null)
                    }}
                />
            )}
        </div>
    )
}
