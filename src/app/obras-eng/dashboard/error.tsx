'use client'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div style={{ padding: '32px', maxWidth: '700px', margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(239,68,68,0.3)' }}>
                <h3 style={{ color: 'var(--accent-red)', fontSize: '16px', marginBottom: '8px' }}>
                    Erro ao carregar o Dashboard
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', wordBreak: 'break-word' }}>
                    {error?.message || 'Erro desconhecido'}
                </p>
                {error?.digest && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Digest: {error.digest}</p>
                )}
                <button onClick={() => reset()} className="btn-secondary">Tentar novamente</button>
            </div>
        </div>
    )
}
