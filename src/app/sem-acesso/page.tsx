'use client'

import { useRouter } from 'next/navigation'
import { ShieldX, ArrowLeft, Package } from 'lucide-react'

export default function SemAcessoPage() {
    const router = useRouter()

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            padding: '20px',
            backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(239, 68, 68, 0.06) 0%, transparent 50%)',
        }}>
            <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
                {/* Icon */}
                <div style={{
                    width: 72, height: 72, borderRadius: '18px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    margin: '0 auto 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <ShieldX size={36} color="var(--accent-red)" />
                </div>

                {/* Title */}
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>
                    Acesso Restrito
                </h1>
                <p style={{
                    fontSize: '15px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.6',
                    marginBottom: '32px',
                }}>
                    Você ainda não tem acesso ao módulo <strong style={{ color: 'var(--text-secondary)' }}>Obras</strong>.
                    Entre em contato com o administrador do sistema para solicitar a liberação.
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => router.push('/')}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <ArrowLeft size={16} />
                        Voltar ao início
                    </button>
                    <button
                        onClick={() => router.push('/board')}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Package size={16} />
                        Ir para Suprimentos
                    </button>
                </div>
            </div>
        </div>
    )
}
