'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * Importação do orçamento numa obra JÁ cadastrada.
 * Aparece na aba Medições enquanto a obra não tem itens de orçamento — é o
 * caminho para quem criou a obra antes de montar a planilha.
 */
export default function ImportarOrcamentoCard({ obraId }: { obraId: string }) {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    async function importar() {
        if (!file) return
        setError('')
        setSuccess('')
        setLoading(true)

        const formData = new FormData()
        formData.append('obraId', obraId)
        formData.append('file', file)

        try {
            const res = await fetch('/api/obras/importar-excel', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao importar o orçamento')

            const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
            setSuccess(
                data.confere === false
                    ? `Orçamento importado, mas ATENÇÃO: o total da planilha (${fmt(data.total_planilha)}) não bateu com o cadastrado (${fmt(data.total_cadastrado)}). Confira a planilha.`
                    : `Orçamento importado! ${data.items_count} itens, total ${fmt(data.total_cadastrado)}.`
            )
            setTimeout(() => router.refresh(), data.confere === false ? 5000 : 2000)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
            setLoading(false)
        }
    }

    return (
        <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <FileSpreadsheet size={18} color="var(--accent-green)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Importar orçamento (Excel)</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                Esta obra ainda não tem orçamento. Importe a planilha para liberar as medições —
                são os itens do orçamento que aparecem para medir.
            </p>

            <label
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '28px 20px', border: '2px dashed var(--border-glass)', borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.02)', cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    if (loading) return
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
                    disabled={loading}
                    onChange={(e) => { setFile(e.target.files?.[0] || null); setError(''); setSuccess('') }}
                    style={{ display: 'none' }}
                />
                {file ? (
                    <>
                        <FileSpreadsheet size={30} color="var(--accent-green)" style={{ marginBottom: '10px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{file.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                    </>
                ) : (
                    <>
                        <Upload size={30} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Clique para selecionar o arquivo</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Formato aceito: .xlsx</span>
                    </>
                )}
            </label>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                Colunas: <strong>Item</strong>, <strong>Descrição</strong>, <strong>Un.</strong>, <strong>Quant.</strong>, <strong>Preço Un.</strong>, <strong>Total</strong>. Itens-pai (cabeçalhos) ficam com <strong>Un.</strong> e <strong>Quant.</strong> vazias.{' '}
                <a href="/modelo-orcamento-obra.xlsx" download style={{ color: 'var(--accent-green-light, #34d399)', fontWeight: 600, textDecoration: 'underline' }}>
                    Baixar modelo
                </a>
            </p>

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--accent-red-light)', marginTop: '16px' }}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {success && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--accent-green-light)', marginTop: '16px' }}>
                    <CheckCircle2 size={16} />
                    {success}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" onClick={importar} className="btn-primary" disabled={loading || !file || !!success} style={{ minWidth: '150px' }}>
                    {loading ? 'Importando...' : 'Importar orçamento'}
                </button>
            </div>
        </div>
    )
}
