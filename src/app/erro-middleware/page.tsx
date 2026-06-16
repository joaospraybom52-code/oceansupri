'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
    const searchParams = useSearchParams()
    const msg = searchParams.get('msg')

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '24px' }}>
                <h2 style={{ color: 'var(--accent-red)', marginBottom: '16px', fontSize: '20px' }}>Erro no Middleware</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>O servidor falhou ao validar sua sessão ou permissão:</p>
                <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', textAlign: 'left', overflowX: 'auto', color: 'var(--accent-red-light)', fontSize: '13px' }}>
                    {msg || 'Erro desconhecido'}
                </pre>
                <Link href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '24px', textDecoration: 'none', padding: '10px 20px' }}>
                    Voltar ao Início
                </Link>
            </div>
        </div>
    )
}

export default function ErroMiddlewarePage() {
    return (
        <Suspense fallback={<div>Carregando erro...</div>}>
            <ErrorContent />
        </Suspense>
    )
}
