'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PedidoCompra, StatusFSM } from '@/lib/types/database'
import { KANBAN_COLUMNS, STATUS_LABELS, STATUS_COLORS, getNextStatus } from '@/lib/utils/kpi-calculations'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import PedidoModal from '@/components/pedidos/PedidoModal'
import StageTransitionModal from './StageTransitionModal'
import AutoGroupModal from './AutoGroupModal'

interface KanbanBoardProps {
    initialPedidos: PedidoCompra[]
}

export default function KanbanBoard({ initialPedidos }: KanbanBoardProps) {
    const [pedidos, setPedidos] = useState<PedidoCompra[]>(initialPedidos)
    const [selectedPedido, setSelectedPedido] = useState<PedidoCompra | null>(null)
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const [transitionPedido, setTransitionPedido] = useState<{ pedido: PedidoCompra, newStatus: StatusFSM, isGroup: boolean, groupId: string | null } | null>(null)
    const [autoGroupPrompt, setAutoGroupPrompt] = useState<{ pedido: PedidoCompra, existingMatch: PedidoCompra, numeroCotacao: string, updateData: Record<string, any>, isGroup: boolean, groupId: string | null } | null>(null)
    const [compradores, setCompradores] = useState<{ id: string, nome: string }[]>([])
    const supabase = createClient()

    useEffect(() => {
        setPedidos(initialPedidos)
    }, [initialPedidos])

    useEffect(() => {
        async function loadCompradores() {
            const { data } = await supabase.from('compradores').select('id, nome').order('nome')
            if (data) setCompradores(data)
        }
        loadCompradores()
    }, [])

    async function handleDrop(targetStatus: StatusFSM, rawDragData: string) {
        const [dragData] = rawDragData.split('|');
        const isGroup = dragData.startsWith('group:');
        const id = dragData.replace('group:', '').replace('pedido:', '');

        const pedidoRepresentante = isGroup ? pedidos.find(p => p.grupo_cotacao_id === id) : pedidos.find(p => p.id === id);

        if (!pedidoRepresentante || pedidoRepresentante.status_fsm === targetStatus) return

        // Abrir modal de transição com campos específicos
        setTransitionPedido({ pedido: pedidoRepresentante, newStatus: targetStatus, isGroup, groupId: isGroup ? id : null })
        setDraggedId(null)
    }

    async function handleGroupDrop(rawDragData: string, targetPedidoId: string) {
        console.log("DROP ITEM CATCHED", rawDragData, "OVER", targetPedidoId);
        const [dragData] = rawDragData.split('|');
        const isGroupDrag = dragData.startsWith('group:');
        const dragId = dragData.replace('group:', '').replace('pedido:', '');

        const targetPedido = pedidos.find(p => p.id === targetPedidoId);
        if (!targetPedido) return;

        const dragPedido = isGroupDrag ? pedidos.find(p => p.grupo_cotacao_id === dragId) : pedidos.find(p => p.id === dragId);
        if (!dragPedido || dragPedido.status_fsm !== targetPedido.status_fsm) return;

        // Regra de negócio: Só pode agrupar se tiverem o mesmo número de cotação, e ele não for vazio
        if (!dragPedido.categoria_cap || dragPedido.categoria_cap !== targetPedido.categoria_cap) {
            alert('Não é possível agrupar! Os pedidos precisam ter o mesmo Nº de Cotação preenchido.');
            return;
        }

        const newGroupId = targetPedido.grupo_cotacao_id || crypto.randomUUID();

        console.log("Group ID assigned:", newGroupId);

        // Update target se não tiver grupo ainda
        if (!targetPedido.grupo_cotacao_id) {
            await supabase.from('pedidos_compra').update({ grupo_cotacao_id: newGroupId }).eq('id', targetPedido.id);
            setPedidos(prev => prev.map(p => p.id === targetPedido.id ? { ...p, grupo_cotacao_id: newGroupId } : p));
        }

        // Update dragged items para o novo group
        if (isGroupDrag) {
            await supabase.from('pedidos_compra').update({ grupo_cotacao_id: newGroupId }).eq('grupo_cotacao_id', dragId);
            setPedidos(prev => prev.map(p => p.grupo_cotacao_id === dragId ? { ...p, grupo_cotacao_id: newGroupId } : p));
        } else {
            await supabase.from('pedidos_compra').update({ grupo_cotacao_id: newGroupId }).eq('id', dragId);
            setPedidos(prev => prev.map(p => p.id === dragId ? { ...p, grupo_cotacao_id: newGroupId } : p));
        }

        console.log("Group assignment complete");
    }

    async function handleConfirmTransition(updateData: Record<string, any>) {
        if (!transitionPedido) return
        const { pedido, newStatus, isGroup, groupId } = transitionPedido

        let finalUpdateData = { ...updateData };
        if (newStatus === 'em_cotacao' && finalUpdateData.categoria_cap) {
            const existingMatch = pedidos.find(p =>
                p.status_fsm === 'em_cotacao' &&
                p.categoria_cap === finalUpdateData.categoria_cap &&
                p.id !== pedido.id &&
                (!isGroup || p.grupo_cotacao_id !== groupId)
            );

            if (existingMatch) {
                // Pause the execution and show the custom modal
                setAutoGroupPrompt({
                    pedido,
                    existingMatch,
                    numeroCotacao: finalUpdateData.categoria_cap,
                    updateData: finalUpdateData,
                    isGroup,
                    groupId
                })
                return;
            }
        }

        // Se não houver match, executa normalmente
        await executeTransition(pedido, finalUpdateData, isGroup, groupId)
    }

    async function handleAutoGroupResult(wantsToGroup: boolean) {
        if (!autoGroupPrompt) return;
        const { pedido, existingMatch, updateData, isGroup, groupId } = autoGroupPrompt;
        let finalUpdateData = { ...updateData };

        if (wantsToGroup) {
            const existingGroupId = existingMatch.grupo_cotacao_id || crypto.randomUUID();
            finalUpdateData.grupo_cotacao_id = existingGroupId;

            if (!existingMatch.grupo_cotacao_id) {
                await supabase.from('pedidos_compra').update({ grupo_cotacao_id: existingGroupId }).eq('id', existingMatch.id);
                setPedidos(prev => prev.map(p => p.id === existingMatch.id ? { ...p, grupo_cotacao_id: existingGroupId } : p));
            }
        }

        await executeTransition(pedido, finalUpdateData, isGroup, groupId);
        setAutoGroupPrompt(null);
    }

    async function executeTransition(pedido: PedidoCompra, finalUpdateData: Record<string, any>, isGroup: boolean, groupId: string | null) {
        if (isGroup && groupId) {
            await supabase.from('pedidos_compra').update(finalUpdateData).eq('grupo_cotacao_id', groupId);
            setPedidos(prev => prev.map(p => p.grupo_cotacao_id === groupId ? { ...p, ...finalUpdateData } as PedidoCompra : p))
        } else {
            await supabase.from('pedidos_compra').update(finalUpdateData).eq('id', pedido.id)
            setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, ...finalUpdateData } as PedidoCompra : p))
        }
        setTransitionPedido(null)
    }

    function getPedidosByStatus(status: StatusFSM): PedidoCompra[] {
        if (status === 'ordem_gerada') {
            return pedidos.filter(p => ['aprovado', 'ordem_gerada', 'aguardando_entrega'].includes(p.status_fsm || ''))
        }
        return pedidos.filter(p => p.status_fsm === status)
    }

    function getGroupedPedidosByStatus(status: StatusFSM): PedidoCompra[][] {
        const statusPedidos = getPedidosByStatus(status);
        const groups: Record<string, PedidoCompra[]> = {};
        const singles: PedidoCompra[][] = [];

        statusPedidos.forEach(p => {
            if (p.grupo_cotacao_id) {
                if (!groups[p.grupo_cotacao_id]) groups[p.grupo_cotacao_id] = [];
                groups[p.grupo_cotacao_id].push(p);
            } else {
                singles.push([p]);
            }
        });

        // Retorna todos os grupos convertidos em arrays, concatenando os singles
        return [...singles, ...Object.values(groups)];
    }

    return (
        <>
            <div style={{
                display: 'flex', gap: '16px', overflowX: 'auto',
                paddingBottom: '16px', minHeight: 'calc(100vh - 180px)'
            }}>
                {KANBAN_COLUMNS.map(status => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        label={STATUS_LABELS[status]}
                        color={STATUS_COLORS[status]}
                        count={getPedidosByStatus(status).length}
                        onDrop={(dragData: string) => handleDrop(status, dragData)}
                        isDragOver={false}
                    >
                        {getGroupedPedidosByStatus(status).map(group => (
                            <KanbanCard
                                key={group[0].grupo_cotacao_id || group[0].id}
                                pedidos={group}
                                onDragStart={(dragData: string) => setDraggedId(dragData)}
                                onClick={() => setSelectedPedido(group[0])}
                                onDropOnCard={handleGroupDrop}
                                onDelete={(id: string) => setPedidos(prev => prev.filter(p => p.id !== id))}
                                compradores={compradores}
                            />
                        ))}
                    </KanbanColumn>
                ))}
            </div>

            {transitionPedido && (
                <StageTransitionModal
                    pedido={transitionPedido.pedido}
                    newStatus={transitionPedido.newStatus}
                    onClose={() => setTransitionPedido(null)}
                    onConfirm={handleConfirmTransition}
                />
            )}

            {selectedPedido && (
                <PedidoModal
                    pedido={selectedPedido}
                    pedidosGroup={selectedPedido.grupo_cotacao_id ? pedidos.filter(p => p.grupo_cotacao_id === selectedPedido.grupo_cotacao_id) : [selectedPedido]}
                    onClose={() => setSelectedPedido(null)}
                    onUpdate={(updated, allUpdated) => {
                        if (allUpdated && allUpdated.length > 0) {
                            setPedidos(prev => {
                                const map = new Map(allUpdated.map(u => [u.id, u]));
                                return prev.map(p => map.has(p.id) ? map.get(p.id)! : p);
                            })
                        } else {
                            setPedidos(prev => prev.map(p => p.id === updated.id ? updated : p))
                        }
                        setSelectedPedido(updated)
                    }}
                    onDelete={(id) => {
                        setPedidos(prev => prev.filter(p => p.id !== id))
                        setSelectedPedido(null)
                    }}
                />
            )}

            {autoGroupPrompt && (
                <AutoGroupModal
                    pedido={autoGroupPrompt.pedido}
                    existingMatch={autoGroupPrompt.existingMatch}
                    numeroCotacao={autoGroupPrompt.numeroCotacao}
                    onClose={() => setAutoGroupPrompt(null)}
                    onConfirm={handleAutoGroupResult}
                />
            )}
        </>
    )
}
