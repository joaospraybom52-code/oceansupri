'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, HardHat, ArrowRight, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ModuleCard {
    id: string
    title: string
    subtitle: string
    icon: React.ReactNode
    gradient: string
    glowColor: string
    href: string
}

const modules: ModuleCard[] = [
    {
        id: 'suprimentos',
        title: 'Suprimentos',
        subtitle: 'Gestão de Compras para Construção Civil',
        icon: <Package size={32} />,
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        glowColor: 'rgba(99, 102, 241, 0.3)',
        href: '/login?modulo=suprimentos',
    },
    {
        id: 'obras',
        title: 'Obras',
        subtitle: 'Gestão de Obras, Medição e Planejamento',
        icon: <HardHat size={32} />,
        gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        glowColor: 'rgba(16, 185, 129, 0.3)',
        href: '/login?modulo=obras',
    },
]

export default function LauncherPage() {
    const router = useRouter()
    const supabase = createClient()
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [hoveredModule, setHoveredModule] = useState<string | null>(null)

    useEffect(() => {
        async function checkSession() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setIsLoggedIn(true)
                setUserEmail(user.email || null)
            }
        }
        checkSession()
    }, [])

    function handleModuleClick(mod: ModuleCard) {
        if (isLoggedIn) {
            if (mod.id === 'suprimentos') {
                window.location.href = '/board'
            } else {
                window.location.href = '/obras-eng'
            }
        } else {
            window.location.href = mod.href
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            padding: '20px',
            backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 50%)',
        }}>
            {/* Logo & Title */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{
                    width: 64, height: 64, borderRadius: '18px',
                    background: 'var(--gradient-accent)', margin: '0 auto 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 40px rgba(99, 102, 241, 0.25)',
                }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>CW</span>
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
                    Constrowins
                </h1>
                <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '400px' }}>
                    Selecione o módulo que deseja acessar
                </p>
                {isLoggedIn && userEmail && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Logado como <span style={{ color: 'var(--accent-blue-light)' }}>{userEmail}</span>
                    </p>
                )}
            </div>

            {/* Module Cards */}
            <div style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: '700px',
            }}>
                {modules.map((mod) => {
                    const isHovered = hoveredModule === mod.id
                    return (
                        <button
                            key={mod.id}
                            onClick={() => handleModuleClick(mod)}
                            onMouseEnter={() => setHoveredModule(mod.id)}
                            onMouseLeave={() => setHoveredModule(null)}
                            style={{
                                width: '300px',
                                padding: '32px 24px',
                                background: 'var(--bg-card)',
                                backdropFilter: 'blur(16px)',
                                border: `1px solid ${isHovered ? 'rgba(255,255,255,0.15)' : 'var(--border-glass)'}`,
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                textAlign: 'left',
                                position: 'relative',
                                overflow: 'hidden',
                                transform: isHovered ? 'translateY(-4px)' : 'none',
                                boxShadow: isHovered ? `0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${mod.glowColor}` : 'var(--shadow-lg)',
                                fontFamily: 'Inter, sans-serif',
                                color: 'var(--text-primary)',
                            }}
                        >
                            {/* Gradient top bar */}
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0,
                                height: '3px',
                                background: mod.gradient,
                            }} />

                            {/* Icon */}
                            <div style={{
                                width: 56, height: 56,
                                borderRadius: '14px',
                                background: mod.gradient,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                                boxShadow: `0 0 20px ${mod.glowColor}`,
                                transition: 'all 0.3s ease',
                                transform: isHovered ? 'scale(1.05)' : 'none',
                            }}>
                                {mod.icon}
                            </div>

                            {/* Text */}
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                marginBottom: '6px',
                            }}>
                                {mod.title}
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--text-muted)',
                                marginBottom: '20px',
                                lineHeight: '1.4',
                            }}>
                                {mod.subtitle}
                            </p>

                            {/* CTA */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                                transition: 'all 0.2s ease',
                            }}>
                                {isLoggedIn ? 'Acessar' : 'Entrar'}
                                <ArrowRight size={14} style={{
                                    transition: 'transform 0.2s ease',
                                    transform: isHovered ? 'translateX(4px)' : 'none',
                                }} />
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
