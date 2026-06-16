import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-primary)',
            }}>
                <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
