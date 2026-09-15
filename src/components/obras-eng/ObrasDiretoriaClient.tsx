'use client'

import { useMemo, useState } from 'react'
import { Briefcase } from 'lucide-react'
import { montarLinhasCusto, type LinhaCusto as Linha, type TipoLinhaCusto as Tipo } from '@/lib/utils/custo'
import MateriaisInsumoPanel, { type MaterialInsumo } from './MateriaisInsumoPanel'

export interface VendaUau {
    num_ven: number
    origem: string
    status_ven: number | null
    cliente: string | null
    valor_tot: number | null
    data_ven: string | null
}
export interface VinculoCliente {
    item_plt: string
    cliente: string
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

// Mesmas cores do Acompanhamento de Custo: item pai em azul escuro, serviço em
// amarelo, insumo sem cor.
const ESTILO: Record<Tipo, React.CSSProperties> = {
    raiz: { background: '#1F4E78', color: '#fff', fontWeight: 700 },
    subtotal: { background: '#9DC3E6', color: '#10243a', fontWeight: 600 },
    servico: { background: '#FFE699', color: '#5a4a00', fontWeight: 600 },
    insumo: { background: 'transparent', color: 'var(--text-secondary)', fontWeight: 400 },
}
const NIVEL: Record<Tipo, number> = { raiz: 0, subtotal: 1, servico: 2, insumo: 3 }

export default function ObrasDiretoriaClient({
    obra, linhas, materiais, vendas, vinculos,
}: {
    obra: string
    linhas: Linha[]
    materiais: MaterialInsumo[]
    vendas: VendaUau[]
    vinculos: VinculoCliente[]
}) {
    const [sel, setSel] = useState<{ item: string; descr: string; ins_cins: string } | null>(null)

    const { rows, atualizado } = useMemo(() => montarLinhasCusto(linhas, [], obra), [linhas, obra])
    const nomeObra = linhas[0]?.obra || obra

    const materiaisSel = useMemo(() => {
        if (!sel) return []
        return materiais
            .filter(m => (m.item_plt || '') === sel.item && (m.ins_cins || '') === sel.ins_cins)
            .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))
    }, [materiais, sel])

    // ── Resumo por cliente: cada item pai entra no grupo do cliente vinculado;
    //    item sem vínculo vira um grupo dele mesmo (tem custo, não tem receita).
    //    Cliente com venda e sem item vinculado também aparece, com custo zero —
    //    assim nenhum recebimento some da conta.
    const resumo = useMemo(() => {
        const porItem = new Map<string, string>()
        for (const v of vinculos) porItem.set(v.item_plt, v.cliente)

        type Grupo = { chave: string; nome: string; itens: string[]; custo: number; recebido: number; aReceber: number }
        const grupos = new Map<string, Grupo>()
        const novo = (chave: string, nome: string): Grupo => {
            const g = grupos.get(chave) ?? { chave, nome, itens: [], custo: 0, recebido: 0, aReceber: 0 }
            grupos.set(chave, g)
            return g
        }

        for (const r of rows.filter(r => r.tipo === 'raiz')) {
            const cliente = porItem.get(r.item)
            const g = cliente
                ? novo(`cli:${norm(cliente)}`, cliente)
                : novo(`item:${r.item}`, `${r.item} — ${r.descricao}`)
            g.itens.push(r.item)
            g.custo += r.aprov
        }

        for (const v of vendas) {
            const g = novo(`cli:${norm(v.cliente || '')}`, v.cliente || '(sem cliente)')
            const valor = Number(v.valor_tot || 0)
            if (v.status_ven === 3) g.recebido += valor
            else g.aReceber += valor
        }

        const lista = Array.from(grupos.values())
            .map(g => ({ ...g, saldo: g.recebido - g.custo }))
            .sort((a, b) => b.recebido - a.recebido || b.custo - a.custo)
        const total = lista.reduce((s, g) => ({
            custo: s.custo + g.custo, recebido: s.recebido + g.recebido,
            aReceber: s.aReceber + g.aReceber, saldo: s.saldo + g.saldo,
        }), { custo: 0, recebido: 0, aReceber: 0, saldo: 0 })
        return { lista, total }
    }, [rows, vendas, vinculos])

    const th: React.CSSProperties = { padding: '10px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--bg-secondary)' }
    const td: React.CSSProperties = { padding: '8px 12px', fontSize: '13px', textAlign: 'right', whiteSpace: 'nowrap' }
    const corSaldo = (v: number) => (v >= 0 ? 'var(--accent-green, #10b981)' : '#ef4444')

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Briefcase size={22} color="#10b981" /> Obras diretoria
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {nomeObra} · custo por item e resultado por cliente (origem: UAU)
                    {atualizado ? ` · atualizado em ${new Date(atualizado).toLocaleString('pt-BR')}` : ''}
                </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="glass-card" style={{ padding: 0, flex: sel ? '1 1 56%' : '1 1 100%', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...th, textAlign: 'left', width: '86px' }}>Item</th>
                                    <th style={{ ...th, textAlign: 'left' }}>Descrição</th>
                                    <th style={{ ...th, width: '140px' }}>Custo</th>
                                    <th style={{ ...th, width: '140px' }}>Vinculado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => {
                                    const clicavel = r.tipo === 'insumo'
                                    const ativa = !!sel && sel.item === r.item && sel.ins_cins === r.ins_cins
                                    return (
                                        <tr
                                            key={`${r.item}-${r.tipo}-${i}`}
                                            onClick={clicavel ? () => setSel({ item: r.item, descr: r.descricao, ins_cins: r.ins_cins }) : undefined}
                                            style={{
                                                ...ESTILO[r.tipo],
                                                cursor: clicavel ? 'pointer' : 'default',
                                                outline: ativa ? '2px solid #10b981' : undefined,
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            }}
                                        >
                                            <td style={{ ...td, textAlign: 'left', paddingLeft: `${12 + NIVEL[r.tipo] * 14}px` }}>{r.item}</td>
                                            <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal' }}>{r.descricao}</td>
                                            <td style={td}>{fmt(r.aprov)}</td>
                                            <td style={td}>{fmt(r.vinc)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {sel && (
                    <MateriaisInsumoPanel
                        item={sel.item}
                        descricao={sel.descr}
                        materiais={materiaisSel}
                        onClose={() => setSel(null)}
                    />
                )}
            </div>

            {/* Resumo por cliente */}
            <div className="glass-card" style={{ padding: 0, marginTop: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 10px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Resultado por cliente</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Custo somado dos itens de cada cliente · recebido (venda paga) e a receber (venda em aberto) · saldo = recebido − custo
                    </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, textAlign: 'left' }}>Cliente / Item</th>
                                <th style={{ ...th, textAlign: 'left', width: '110px' }}>Itens</th>
                                <th style={{ ...th, width: '130px' }}>Custo</th>
                                <th style={{ ...th, width: '130px' }}>Recebido</th>
                                <th style={{ ...th, width: '130px' }}>A receber</th>
                                <th style={{ ...th, width: '140px' }}>Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resumo.lista.map(g => (
                                <tr key={g.chave} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ ...td, textAlign: 'left', whiteSpace: 'normal', fontWeight: 600 }}>{g.nome}</td>
                                    <td style={{ ...td, textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>{g.itens.join(', ') || '—'}</td>
                                    <td style={td}>{fmt(g.custo)}</td>
                                    <td style={td}>{fmt(g.recebido)}</td>
                                    <td style={{ ...td, color: 'var(--text-muted)' }}>{fmt(g.aReceber)}</td>
                                    <td style={{ ...td, fontWeight: 700, color: corSaldo(g.saldo) }}>{fmt(g.saldo)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <td style={{ ...td, textAlign: 'left', fontWeight: 800 }} colSpan={2}>TOTAL</td>
                                <td style={{ ...td, fontWeight: 800 }}>{fmt(resumo.total.custo)}</td>
                                <td style={{ ...td, fontWeight: 800 }}>{fmt(resumo.total.recebido)}</td>
                                <td style={{ ...td, fontWeight: 800, color: 'var(--text-muted)' }}>{fmt(resumo.total.aReceber)}</td>
                                <td style={{ ...td, fontWeight: 800, color: corSaldo(resumo.total.saldo) }}>{fmt(resumo.total.saldo)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    )
}
