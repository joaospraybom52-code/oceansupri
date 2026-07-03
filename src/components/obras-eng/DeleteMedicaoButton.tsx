'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

export default function DeleteMedicaoButton({ medicaoId, periodo }: { medicaoId: string; periodo: string }) {
    const [confirmando, setConfirmando] = useState(false)
    const [excluindo, setExcluindo] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    async function excluir() {
        setExcluindo(true)
        try {
            // medicao_itens tem ON DELETE CASCADE, então some junto.
            const { data, error } = await supabase.from('medicoes').delete().eq('id', medicaoId).select('id')
            if (error) throw error
            if (!data || data.length === 0) throw new Error('Nada foi excluído (sem permissão?).')
            setConfirmando(false)
            router.refresh()
        } catch (e) {
            console.error('Erro ao excluir medição:', e)
            alert('Não foi possível excluir a medição.')
        } finally {
            setExcluindo(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setConfirmando(true)}
                title="Excluir medição"
                style={{ background: 'none', border: '1px solid var(--border-glass)', borderRadius: '8px', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '8px', verticalAlign: 'middle' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-glass)' }}
            >
                <Trash2 size={15} />
            </button>

            {confirmando && (
                <div
                    onClick={() => !excluindo && setConfirmando(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
                >
                    <div onClick={e => e.stopPropagation()} className="glass-card" style={{ padding: '24px', width: '420px', maxWidth: '100%', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px' }}>Excluir medição</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Tem certeza que deseja excluir a medição de <strong>{periodo}</strong>?
                        </p>
                        <p style={{ fontSize: '13px', color: '#f59e0b', margin: '0 0 20px' }}>⚠️ Essa ação não pode ser desfeita.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setConfirmando(false)} disabled={excluindo} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancelar</button>
                            <button
                                type="button"
                                onClick={excluir}
                                disabled={excluindo}
                                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', opacity: excluindo ? 0.6 : 1 }}
                            >
                                {excluindo ? 'Excluindo…' : 'Sim, excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
