'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, Eye, EyeOff, Package, HardHat, ArrowLeft } from 'lucide-react'

export default function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const modulo = searchParams.get('modulo') || 'suprimentos'
    const isObras = modulo === 'obras'

    useEffect(() => {
        async function checkSession() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                if (isObras) {
                    router.push('/obras-eng')
                } else {
                    router.push('/board')
                }
            }
        }
        checkSession()
    }, [isObras, router, supabase])

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setError('Email ou senha incorretos.')
            setLoading(false)
            return
        }

        if (isObras) {
            router.push('/obras-eng')
        } else {
            router.push('/board')
        }
    }

    const moduleConfig = isObras
        ? {
            icon: <HardHat size={28} color="white" />,
            gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            glow: '0 0 30px rgba(16, 185, 129, 0.25)',
            title: 'Obras CW',
            subtitle: 'Gestão de Obras, Medição e Planejamento',
            badge: 'Entrando em: Obras',
            badgeColor: 'rgba(16, 185, 129, 0.1)',
            badgeBorder: 'rgba(16, 185, 129, 0.3)',
            badgeText: 'var(--accent-green-light)',
        }
        : {
            icon: <Package size={28} color="white" />,
            gradient: 'var(--gradient-accent)',
            glow: '0 0 30px rgba(99, 102, 241, 0.25)',
            title: 'Suprimentos CW',
            subtitle: 'Gestão de Compras para Construção Civil',
            badge: 'Entrando em: Suprimentos',
            badgeColor: 'rgba(99, 102, 241, 0.1)',
            badgeBorder: 'rgba(99, 102, 241, 0.3)',
            badgeText: 'var(--accent-blue-light)',
        }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', padding: '20px',
            backgroundImage: isObras
                ? 'radial-gradient(ellipse at 30% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(5, 150, 105, 0.06) 0%, transparent 50%)'
                : 'radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 50%)',
        }}>
            <div style={{ maxWidth: '420px', width: '100%' }}>
                <button
                    onClick={() => router.push('/')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500,
                        marginBottom: '24px', fontFamily: 'Inter, sans-serif',
                        transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    <ArrowLeft size={16} />
                    Trocar de módulo
                </button>

                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '16px',
                        background: moduleConfig.gradient, margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: moduleConfig.glow,
                    }}>
                        {moduleConfig.icon}
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>{moduleConfig.title}</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{moduleConfig.subtitle}</p>
                </div>

                <div style={{
                    background: moduleConfig.badgeColor,
                    border: `1px solid ${moduleConfig.badgeBorder}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 14px',
                    textAlign: 'center',
                    marginBottom: '16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: moduleConfig.badgeText,
                }}>
                    {moduleConfig.badge}
                </div>

                <div className="glass-card" style={{ padding: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>Entrar na conta</h2>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                Senha
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                    }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-red-light)' }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px', padding: '12px', fontSize: '15px' }}>
                            <LogIn size={18} />
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
