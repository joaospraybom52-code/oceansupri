import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HardHat, Plus } from 'lucide-react'
import Link from 'next/link'
import { getPapelObras, podeAdminObra } from '@/lib/utils/obras-access'
import ObrasListClient from '@/components/obras-eng/ObrasListClient'

export const dynamic = 'force-dynamic'

export default async function ObrasListPage() {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: obras, error } = await supabase.from('obras_eng').select('*').order('created_at', { ascending: false })

        if (error) {
            throw new Error(error.message)
        }

        const isAdmin = podeAdminObra(await getPapelObras())

        return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
                        Obras
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        Gerencie suas obras, medições e programações semanais
                    </p>
                </div>
                {isAdmin && obras && obras.length > 0 && (
                    <Link href="/obras-eng/nova" className="btn-primary" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 16px', fontSize: '14px', textDecoration: 'none'
                    }}>
                        <Plus size={16} />
                        Nova Obra
                    </Link>
                )}
            </div>

            {/* List or Empty State */}
            {!obras || obras.length === 0 ? (
                <div className="glass-card" style={{
                    padding: '60px 40px',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '18px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        margin: '0 auto 24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <HardHat size={36} color="var(--accent-green)" />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                        Nenhuma obra cadastrada
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                        {isAdmin ? 'Comece cadastrando sua primeira obra e importando o orçamento via planilha Excel.' : 'Ainda não há obras cadastradas.'}
                    </p>
                    {isAdmin && (
                        <Link href="/obras-eng/nova" className="btn-primary" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '12px 24px', fontSize: '15px', textDecoration: 'none'
                        }}>
                            <Plus size={18} />
                            Nova Obra
                        </Link>
                    )}
                </div>
            ) : (
                <ObrasListClient obras={obras} isAdmin={isAdmin} />
            )}
        </div>
        )
    } catch (err: any) {
        return (
            <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '24px' }}>
                    <h2 style={{ color: 'var(--accent-red)', marginBottom: '16px', fontSize: '20px' }}>Erro interno no Servidor</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Ocorreu um erro ao carregar esta página:</p>
                    <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', textAlign: 'left', overflowX: 'auto', color: 'var(--accent-red-light)', fontSize: '13px' }}>
                        {err.message || String(err)}
                        {err.stack && `\n\nStack:\n${err.stack}`}
                    </pre>
                </div>
            </div>
        )
    }
}
