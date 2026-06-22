'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, HardHat, MapPin, Hash } from 'lucide-react'
import Link from 'next/link'

export default function NovaObraPage() {
    const router = useRouter()
    const [nome, setNome] = useState('')
    const [codigoUau, setCodigoUau] = useState('')
    const [local, setLocal] = useState('')
    const [previsaoInicio, setPrevisaoInicio] = useState('')
    const [previsaoTermino, setPrevisaoTermino] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!nome) {
            setError('Digite o nome da obra.')
            return
        }
        if (!file) {
            setError('Selecione o arquivo Excel do orçamento.')
            return
        }

        setError('')
        setSuccess('')
        setLoading(true)

        const formData = new FormData()
        formData.append('nome', nome)
        formData.append('codigoUau', codigoUau)
        formData.append('local', local)
        if (previsaoInicio) formData.append('previsaoInicio', previsaoInicio)
        if (previsaoTermino) formData.append('previsaoTermino', previsaoTermino)
        formData.append('file', file)

        try {
            const res = await fetch('/api/obras/importar-excel', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao importar obra')
            }

            const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
            const aviso = data.confere === false
                ? ` ⚠️ ATENÇÃO: o total da planilha (${fmt(data.total_planilha)}) não bateu com o cadastrado (${fmt(data.total_cadastrado)}). Confira a planilha.`
                : ` Total conferido: ${fmt(data.total_cadastrado)} (${data.items_count} itens).`
            setSuccess('Obra e orçamento importados com sucesso!' + aviso)
            setTimeout(() => {
                router.push('/obras-eng')
                router.refresh()
            }, data.confere === false ? 6000 : 2500)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <Link href="/obras-eng" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
                    <ArrowLeft size={16} /> Voltar para Obras
                </Link>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
                    Cadastrar Nova Obra
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Crie uma nova obra e importe o orçamento inicial via Excel.
                </p>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Nome da Obra */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Nome da Obra
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <HardHat size={18} />
                            </div>
                            <input
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                placeholder="Ex: Residencial Jardins"
                                required
                            />
                        </div>
                    </div>

                    {/* Código UAU & Local da Obra */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Código da Obra no UAU
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                    <Hash size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={codigoUau}
                                    onChange={(e) => setCodigoUau(e.target.value)}
                                    className="input-field"
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="Ex: 001"
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Local da Obra
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                    <MapPin size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={local}
                                    onChange={(e) => setLocal(e.target.value)}
                                    className="input-field"
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="Ex: São Paulo - SP"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Previsão de Início & Término */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Previsão de Início
                            </label>
                            <input
                                type="date"
                                value={previsaoInicio}
                                onChange={(e) => setPrevisaoInicio(e.target.value)}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Previsão de Término
                            </label>
                            <input
                                type="date"
                                value={previsaoTermino}
                                onChange={(e) => setPrevisaoTermino(e.target.value)}
                                className="input-field"
                            />
                        </div>
                    </div>


                    {/* Upload de Excel */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Orçamento (Excel)
                        </label>
                        <label
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '32px 20px', border: '2px dashed var(--border-glass)', borderRadius: 'var(--radius-md)',
                                background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                e.currentTarget.style.borderColor = 'var(--accent-green-light)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                                e.currentTarget.style.borderColor = 'var(--border-glass)'
                            }}
                        >
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                style={{ display: 'none' }}
                                required
                            />
                            {file ? (
                                <>
                                    <FileSpreadsheet size={32} color="var(--accent-green)" style={{ marginBottom: '12px' }} />
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        {file.name}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        Clique para selecionar o arquivo
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        Formato aceito: .xlsx
                                    </span>
                                </>
                            )}
                        </label>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                            Colunas: <strong>Item</strong>, <strong>Descrição</strong>, <strong>Un.</strong>, <strong>Quant.</strong>, <strong>Preço Un.</strong>, <strong>Total</strong>. Itens-pai (cabeçalhos) ficam com <strong>Un.</strong> e <strong>Quant.</strong> vazias.{' '}
                            <a href="/modelo-orcamento-obra.xlsx" download style={{ color: 'var(--accent-green-light, #34d399)', fontWeight: 600, textDecoration: 'underline' }}>
                                Baixar modelo
                            </a>
                        </p>
                    </div>

                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--accent-red-light)' }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--accent-green-light)' }}>
                            <CheckCircle2 size={16} />
                            {success}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={() => router.push('/obras-eng')} className="btn-secondary" disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading || !file || !nome} style={{ minWidth: '140px' }}>
                            {loading ? 'Importando...' : 'Salvar e Importar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
