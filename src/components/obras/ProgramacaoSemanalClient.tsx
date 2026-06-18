'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, HelpCircle, Save, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ProgramacaoSemanalClient({
    obraId,
    programacao,
    initialTarefas,
    initialRestricoes,
    initialAnalises,
    itensOrcamento
}: {
    obraId: string
    programacao: any
    initialTarefas: any[]
    initialRestricoes: any[]
    initialAnalises: any[]
    itensOrcamento: any[]
}) {
    const router = useRouter()
    const supabase = createClient()

    const [tarefas, setTarefas] = useState(initialTarefas)
    const [restricoes, setRestricoes] = useState(initialRestricoes)
    const [analises, setAnalises] = useState(initialAnalises)
    
    const [activeTab, setActiveTab] = useState<'tarefas' | 'restricoes' | '5w2h'>('tarefas')
    const [loading, setLoading] = useState(false)

    // Estado para Nova Tarefa
    const [novaTarefa, setNovaTarefa] = useState({ descricao: '', responsavel: '', item_orcamento_id: '', data_planejada: '' })
    const [showNovaTarefa, setShowNovaTarefa] = useState(false)

    // Estado para Nova Restrição
    const [novaRestricao, setNovaRestricao] = useState({ descricao: '', categoria: 'outros', responsavel: '', prazo_remocao: '', tarefa_id: '' })
    const [showNovaRestricao, setShowNovaRestricao] = useState(false)
    const [isChainingFlow, setIsChainingFlow] = useState(false)

    // Estado para Novo 5W2H
    const [novo5w2h, setNovo5w2h] = useState({
        what_o_que: '',
        why_por_que: '',
        where_onde: '',
        when_quando: '',
        who_quem: '',
        how_como: '',
        how_much_quanto: '',
        tarefa_id: '',
        restricao_id: ''
    })
    const [showNovo5w2h, setShowNovo5w2h] = useState(false)

    // Estado para Modal de Motivo de Não Conclusão
    const [modalMotivoAberto, setModalMotivoAberto] = useState(false)
    const [tarefaIdParaMotivo, setTarefaIdParaMotivo] = useState('')
    const [motivoSelecionado, setMotivoSelecionado] = useState('material')

    // Estado para Visualizar Motivo Longo
    const [modalVerMotivoAberto, setModalVerMotivoAberto] = useState(false)
    const [motivoParaVer, setMotivoParaVer] = useState('')

    const getMotivoLabel = (motivo: string) => {
        const map: Record<string, string> = {
            'material': 'Falta de Material',
            'mao_de_obra': 'Falta de Mão de Obra',
            'projeto': 'Problema de Projeto',
            'equipamento': 'Falha em Equipamento',
            'area_frente': 'Área/Frente Indisponível',
            'clima': 'Condições Climáticas',
            'planejamento': 'Erro de Planejamento',
            'terceiros': 'Atraso de Terceiros',
            'outros': 'Outros'
        }
        return map[motivo] || motivo.replace(/_/g, ' ')
    }

    // Cálculos de KPI
    const totalTarefas = tarefas.length
    const tarefasConcluidas = tarefas.filter(t => t.status === 'concluida').length
    const ppc = totalTarefas > 0 ? (tarefasConcluidas / totalTarefas) * 100 : 0

    const totalRestricoes = restricoes.length
    const restricoesRemovidas = restricoes.filter(r => r.status === 'removida').length
    const irr = totalRestricoes > 0 ? (restricoesRemovidas / totalRestricoes) * 100 : 0

    const ir = totalTarefas > 0 ? (totalRestricoes / totalTarefas) * 100 : 0

    async function handleAddTarefa(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const { data, error } = await supabase.from('tarefas').insert({
            programacao_id: programacao.id,
            descricao: novaTarefa.descricao,
            responsavel: novaTarefa.responsavel,
            item_orcamento_id: novaTarefa.item_orcamento_id || null,
            data_planejada: novaTarefa.data_planejada || null,
            status: 'planejada'
        }).select('*, itens_orcamento(descricao, codigo)').single()

        if (data && !error) {
            setTarefas([...tarefas, data])
            setNovaTarefa({ descricao: '', responsavel: '', item_orcamento_id: '', data_planejada: '' })
            setShowNovaTarefa(false)
            toast.success('Tarefa adicionada com sucesso!')
        } else if (error) {
            toast.error('Erro ao adicionar tarefa: ' + error.message)
        }
        setLoading(false)
    }

    async function handleAddRestricao(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const { data, error } = await supabase.from('restricoes').insert({
            programacao_id: programacao.id,
            obra_id: obraId,
            descricao: novaRestricao.descricao,
            categoria: novaRestricao.categoria,
            responsavel: novaRestricao.responsavel,
            prazo_remocao: novaRestricao.prazo_remocao,
            data_identificacao: new Date().toISOString().split('T')[0],
            tarefa_id: novaRestricao.tarefa_id || null,
            status: 'pendente'
        }).select().single()

        if (data && !error) {
            setRestricoes([...restricoes, data])
            const t_id = novaRestricao.tarefa_id
            const r_id = data.id
            setNovaRestricao({ descricao: '', categoria: 'outros', responsavel: '', prazo_remocao: '', tarefa_id: '' })
            setShowNovaRestricao(false)
            toast.success('Restrição registrada com sucesso!')

            if (isChainingFlow) {
                setIsChainingFlow(false)
                setNovo5w2h({
                    what_o_que: '',
                    why_por_que: '',
                    where_onde: '',
                    when_quando: '',
                    who_quem: '',
                    how_como: '',
                    how_much_quanto: '',
                    tarefa_id: t_id,
                    restricao_id: r_id
                })
                setActiveTab('5w2h')
                setShowNovo5w2h(true)
            }
        } else if (error) {
            toast.error('Erro ao registrar restrição: ' + error.message)
        }
        setLoading(false)
    }

    async function handleAdd5w2h(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const { data, error } = await supabase.from('analises_5w2h' as any).insert({
            tarefa_id: novo5w2h.tarefa_id || null,
            restricao_id: novo5w2h.restricao_id || null,
            what_o_que: novo5w2h.what_o_que,
            why_por_que: novo5w2h.why_por_que,
            where_onde: novo5w2h.where_onde,
            when_quando: novo5w2h.when_quando || null,
            who_quem: novo5w2h.who_quem,
            how_como: novo5w2h.how_como,
            how_much_quanto: novo5w2h.how_much_quanto
        }).select().single()

        if (data && !error) {
            setAnalises([...analises, data])
            setNovo5w2h({ what_o_que: '', why_por_que: '', where_onde: '', when_quando: '', who_quem: '', how_como: '', how_much_quanto: '', tarefa_id: '', restricao_id: '' })
            setShowNovo5w2h(false)
            toast.success('5W2H registrado com sucesso!')
        } else if (error) {
            toast.error('Erro ao registrar 5W2H: ' + error.message)
        }
        setLoading(false)
    }

    async function updateTarefaStatus(id: string, newStatus: string, motivo: string = '') {
        const { error } = await supabase.from('tarefas')
            .update({ status: newStatus, motivo_nao_conclusao: motivo || null })
            .eq('id', id)
        
        if (!error) {
            setTarefas(tarefas.map(t => t.id === id ? { ...t, status: newStatus, motivo_nao_conclusao: motivo || null } : t))
            toast.success('Status da tarefa atualizado!')
        } else {
            toast.error('Erro ao atualizar tarefa: ' + error.message)
        }
    }

    async function updateRestricaoStatus(id: string, newStatus: string) {
        const dataRemocao = newStatus === 'removida' ? new Date().toISOString().split('T')[0] : null
        const { error } = await supabase.from('restricoes')
            .update({ status: newStatus, data_remocao: dataRemocao })
            .eq('id', id)
        
        if (!error) {
            setRestricoes(restricoes.map(r => r.id === id ? { ...r, status: newStatus, data_remocao: dataRemocao } : r))
            toast.success('Restrição atualizada!')
        } else {
            toast.error('Erro ao atualizar restrição: ' + error.message)
        }
    }

    async function fecharProgramacao() {
        const { error } = await supabase.from('programacoes_semanais')
            .update({ status_envio: 'no_prazo', data_envio: new Date().toISOString() })
            .eq('id', programacao.id)
        
        if (!error) {
            toast.success('Programação fechada com sucesso!')
            router.refresh()
        } else {
            toast.error('Erro ao fechar programação: ' + error.message)
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <Link href={`/obras-eng/${obraId}/programacao`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '16px' }}>
                        <ArrowLeft size={16} /> Voltar
                    </Link>
                    <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Semana {new Date(programacao.semana_referente_inicio).toLocaleDateString('pt-BR')} - {new Date(programacao.semana_referente_fim).toLocaleDateString('pt-BR')}</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Responsável: {programacao.responsavel}</p>
                </div>
                <button onClick={fecharProgramacao} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={16} /> Salvar e Enviar
                </button>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="kpi-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>PPC (Planejamento Concluído)</h3>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{ppc.toFixed(1)}%</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tarefasConcluidas} de {totalTarefas} tarefas concluídas</p>
                </div>
                <div className="kpi-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>IRR (Remoção de Restrições)</h3>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{irr.toFixed(1)}%</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{restricoesRemovidas} de {totalRestricoes} restrições removidas</p>
                </div>
                <div className="kpi-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>IR (Índice de Restrições)</h3>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{ir.toFixed(1)}%</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Restrições vs Tarefas</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0' }}>
                <button onClick={() => setActiveTab('tarefas')} style={{ background: 'none', border: 'none', padding: '12px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: activeTab === 'tarefas' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'tarefas' ? '2px solid var(--accent-blue)' : '2px solid transparent', marginBottom: '-1px' }}>
                    Tarefas ({tarefas.length})
                </button>
                <button onClick={() => setActiveTab('restricoes')} style={{ background: 'none', border: 'none', padding: '12px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: activeTab === 'restricoes' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'restricoes' ? '2px solid var(--accent-blue)' : '2px solid transparent', marginBottom: '-1px' }}>
                    Restrições ({restricoes.length})
                </button>
                <button onClick={() => setActiveTab('5w2h')} style={{ background: 'none', border: 'none', padding: '12px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: activeTab === '5w2h' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === '5w2h' ? '2px solid var(--accent-blue)' : '2px solid transparent', marginBottom: '-1px' }}>
                    5W2H ({analises.length})
                </button>
            </div>

            {/* Tab: Tarefas */}
            {activeTab === 'tarefas' && (
                <div>
                    {!showNovaTarefa ? (
                        <button onClick={() => setShowNovaTarefa(true)} className="btn-secondary" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} /> Adicionar Tarefa
                        </button>
                    ) : (
                        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                            <form onSubmit={handleAddTarefa} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                    <input type="text" placeholder="Descrição da Tarefa *" value={novaTarefa.descricao} onChange={e => setNovaTarefa({...novaTarefa, descricao: e.target.value})} className="input-field" required />
                                    <input type="text" placeholder="Responsável *" value={novaTarefa.responsavel} onChange={e => setNovaTarefa({...novaTarefa, responsavel: e.target.value})} className="input-field" required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                    <select value={novaTarefa.item_orcamento_id} onChange={e => setNovaTarefa({...novaTarefa, item_orcamento_id: e.target.value})} className="select-field">
                                        <option value="">Selecione um item do orçamento (Opcional)</option>
                                        {itensOrcamento.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.descricao}</option>)}
                                    </select>
                                    <input type="date" value={novaTarefa.data_planejada} onChange={e => setNovaTarefa({...novaTarefa, data_planejada: e.target.value})} className="input-field" />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button type="button" onClick={() => setShowNovaTarefa(false)} className="btn-secondary">Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={loading}>Salvar Tarefa</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tarefas.map(t => (
                            <div key={t.id} className="glass-card" style={{ 
                                padding: '16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '16px',
                                borderLeft: t.status === 'concluida' ? '4px solid var(--accent-green)' : (t.status === 'nao_concluida' ? '4px solid var(--accent-red)' : '4px solid var(--text-muted)'),
                                marginBottom: '4px'
                            }}>
                                {/* Coluna 1: Descrição e Item */}
                                <div style={{ flex: 2, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px', textTransform: 'capitalize' }}>{t.descricao}</div>
                                    {t.itens_orcamento ? (
                                        <div style={{ fontSize: '11px', color: 'var(--accent-blue)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${t.itens_orcamento.codigo} - ${t.itens_orcamento.descricao}`}>
                                            Item: {t.itens_orcamento.codigo} - {t.itens_orcamento.descricao}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sem item de orçamento</div>
                                    )}
                                </div>

                                {/* Coluna 2: Responsável */}
                                <div style={{ flex: 1, minWidth: 0, paddingLeft: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Responsável</div>
                                    <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {t.responsavel || '-'}
                                    </div>
                                </div>

                                {/* Coluna 3: Prazo */}
                                <div style={{ flex: 1, minWidth: 0, paddingLeft: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Prazo</div>
                                    <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {t.data_planejada ? new Date(t.data_planejada).toLocaleDateString('pt-BR') : '-'}
                                    </div>
                                </div>

                                {/* Coluna 4: Motivo */}
                                <div style={{ flex: 1, minWidth: 0, paddingLeft: '8px' }}>
                                    {t.status === 'nao_concluida' && (
                                        <>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Motivo</div>
                                            <div 
                                                onClick={() => {
                                                    setMotivoParaVer(t.motivo_nao_conclusao ? getMotivoLabel(t.motivo_nao_conclusao) : '')
                                                    setModalVerMotivoAberto(true)
                                                }}
                                                style={{ fontWeight: 500, fontSize: '13px', color: 'var(--accent-red)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'underline' }} 
                                                title="Clique para ver o motivo completo"
                                            >
                                                {t.motivo_nao_conclusao ? getMotivoLabel(t.motivo_nao_conclusao) : '-'}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Coluna 5: Status */}
                                <div style={{ width: '150px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <select value={t.status} onChange={(e) => {
                                        if (e.target.value === 'nao_concluida') {
                                            setTarefaIdParaMotivo(t.id)
                                            setMotivoSelecionado('material') // reset para padrão
                                            setModalMotivoAberto(true)
                                        } else {
                                            updateTarefaStatus(t.id, e.target.value)
                                        }
                                    }} className="select-field" style={{ width: '140px', padding: '6px 10px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)' }}>
                                        <option value="planejada">Planejada</option>
                                        <option value="concluida">Concluída</option>
                                        <option value="nao_concluida">Não Concluída</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab: Restrições */}
            {activeTab === 'restricoes' && (
                <div>
                    {!showNovaRestricao ? (
                        <button onClick={() => setShowNovaRestricao(true)} className="btn-secondary" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} /> Adicionar Restrição
                        </button>
                    ) : (
                        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                            <form onSubmit={handleAddRestricao} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                    <input type="text" placeholder="Descrição da Restrição *" value={novaRestricao.descricao} onChange={e => setNovaRestricao({...novaRestricao, descricao: e.target.value})} className="input-field" required />
                                    <select value={novaRestricao.categoria} onChange={e => setNovaRestricao({...novaRestricao, categoria: e.target.value})} className="select-field">
                                        <option value="projeto">Projeto</option>
                                        <option value="material">Material</option>
                                        <option value="mao_de_obra">Mão de Obra</option>
                                        <option value="equipamento">Equipamento</option>
                                        <option value="area_frente">Área/Frente</option>
                                        <option value="contratacao">Contratação</option>
                                        <option value="clima">Clima</option>
                                        <option value="seguranca">Segurança</option>
                                        <option value="outros">Outros</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <input type="text" placeholder="Responsável *" value={novaRestricao.responsavel} onChange={e => setNovaRestricao({...novaRestricao, responsavel: e.target.value})} className="input-field" required />
                                    <input type="date" value={novaRestricao.prazo_remocao} onChange={e => setNovaRestricao({...novaRestricao, prazo_remocao: e.target.value})} className="input-field" required title="Prazo para Remoção" />
                                    <select value={novaRestricao.tarefa_id} onChange={e => setNovaRestricao({...novaRestricao, tarefa_id: e.target.value})} className="select-field">
                                        <option value="">Vincular a uma Tarefa (Opcional)</option>
                                        {tarefas.map(t => <option key={t.id} value={t.id}>{t.descricao}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button type="button" onClick={() => setShowNovaRestricao(false)} className="btn-secondary">Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={loading}>Salvar Restrição</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {restricoes.map(r => (
                            <div key={r.id} className="glass-card" style={{ 
                                padding: '16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '16px',
                                borderLeft: r.status === 'removida' ? '4px solid var(--accent-green)' : '4px solid var(--accent-amber)',
                                marginBottom: '4px'
                            }}>
                                {/* Coluna 1: Descrição e Categoria */}
                                <div style={{ flex: 2, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{r.descricao}</span>
                                        <span style={{ 
                                            fontSize: '9px', 
                                            fontWeight: 700,
                                            background: 'rgba(255,255,255,0.08)', 
                                            border: '1px solid var(--border-glass)',
                                            color: 'var(--text-secondary)',
                                            padding: '2px 8px', 
                                            borderRadius: '12px', 
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>{r.categoria}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Identificada em: {new Date(r.data_identificacao).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>

                                {/* Coluna 2: Responsável */}
                                <div style={{ flex: 1, minWidth: 0, paddingLeft: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Responsável</div>
                                    <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {r.responsavel || '-'}
                                    </div>
                                </div>

                                {/* Coluna 3: Prazo Remoção */}
                                <div style={{ flex: 1, minWidth: 0, paddingLeft: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Prazo Remoção</div>
                                    <div style={{ 
                                        fontWeight: 600, 
                                        fontSize: '13px', 
                                        color: r.status === 'pendente' && new Date(r.prazo_remocao) < new Date() ? 'var(--accent-red)' : 'var(--text-secondary)' 
                                    }}>
                                        {r.prazo_remocao ? new Date(r.prazo_remocao).toLocaleDateString('pt-BR') : '-'}
                                        {r.status === 'pendente' && new Date(r.prazo_remocao) < new Date() && (
                                            <span style={{ fontSize: '10px', marginLeft: '4px', color: 'var(--accent-red)' }}>(Atrasado)</span>
                                        )}
                                    </div>
                                </div>

                                {/* Coluna 4: Status */}
                                <div style={{ width: '150px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <select value={r.status} onChange={(e) => updateRestricaoStatus(r.id, e.target.value)} className="select-field" style={{ width: '140px', padding: '6px 10px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)' }}>
                                        <option value="pendente">Pendente</option>
                                        <option value="removida">Removida</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab: 5W2H */}
            {activeTab === '5w2h' && (
                <div>
                    {!showNovo5w2h ? (
                        <button onClick={() => setShowNovo5w2h(true)} className="btn-secondary" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} /> Adicionar 5W2H
                        </button>
                    ) : (
                        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                            <form onSubmit={handleAdd5w2h} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>What (O que será feito?)</label>
                                        <input type="text" value={novo5w2h.what_o_que} onChange={e => setNovo5w2h({...novo5w2h, what_o_que: e.target.value})} className="input-field" required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Why (Por que será feito?)</label>
                                        <input type="text" value={novo5w2h.why_por_que} onChange={e => setNovo5w2h({...novo5w2h, why_por_que: e.target.value})} className="input-field" required />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Where (Onde será feito?)</label>
                                        <input type="text" value={novo5w2h.where_onde} onChange={e => setNovo5w2h({...novo5w2h, where_onde: e.target.value})} className="input-field" required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>When (Quando será feito?)</label>
                                        <input type="date" value={novo5w2h.when_quando} onChange={e => setNovo5w2h({...novo5w2h, when_quando: e.target.value})} className="input-field" required />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Who (Quem fará?)</label>
                                        <input type="text" value={novo5w2h.who_quem} onChange={e => setNovo5w2h({...novo5w2h, who_quem: e.target.value})} className="input-field" required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>How (Como será feito?)</label>
                                        <input type="text" value={novo5w2h.how_como} onChange={e => setNovo5w2h({...novo5w2h, how_como: e.target.value})} className="input-field" required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>How Much (Quanto custará?)</label>
                                        <input type="text" value={novo5w2h.how_much_quanto} onChange={e => setNovo5w2h({...novo5w2h, how_much_quanto: e.target.value})} className="input-field" />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vincular Tarefa (Opcional)</label>
                                        <select value={novo5w2h.tarefa_id} onChange={e => setNovo5w2h({...novo5w2h, tarefa_id: e.target.value})} className="select-field">
                                            <option value="">Nenhuma</option>
                                            {tarefas.map(t => <option key={t.id} value={t.id}>{t.descricao}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vincular Restrição (Opcional)</label>
                                        <select value={novo5w2h.restricao_id} onChange={e => setNovo5w2h({...novo5w2h, restricao_id: e.target.value})} className="select-field">
                                            <option value="">Nenhuma</option>
                                            {restricoes.map(r => <option key={r.id} value={r.id}>{r.descricao}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button type="button" onClick={() => setShowNovo5w2h(false)} className="btn-secondary">Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={loading}>Salvar 5W2H</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '12px', border: '1px dashed var(--border-glass)', textAlign: 'center' }}>
                        <HelpCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Análises 5W2H</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Plano de ação estruturado para resolver restrições ou tarefas não concluídas.</p>
                        {analises.length === 0 && <p style={{ marginTop: '16px', color: 'var(--accent-green)' }}>Nenhum plano 5W2H registrado.</p>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        {analises.map(a => (
                            <div key={a.id} className="glass-card" style={{ padding: '20px' }}>
                                <h4 style={{ color: 'var(--accent-blue)', marginBottom: '12px', fontWeight: 600 }}>Plano de Ação</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                                    <div><strong style={{ color: 'var(--text-primary)' }}>What:</strong> {a.what_o_que}</div>
                                    <div><strong style={{ color: 'var(--text-primary)' }}>Why:</strong> {a.why_por_que}</div>
                                    <div><strong style={{ color: 'var(--text-primary)' }}>Where:</strong> {a.where_onde}</div>
                                    <div><strong style={{ color: 'var(--text-primary)' }}>When:</strong> {a.when_quando ? new Date(a.when_quando).toLocaleDateString('pt-BR') : '-'}</div>
                                    <div><strong style={{ color: 'var(--text-primary)' }}>Who:</strong> {a.who_quem}</div>
                                    <div><strong style={{ color: 'var(--text-primary)' }}>How:</strong> {a.how_como}</div>
                                    <div style={{ gridColumn: 'span 2' }}><strong style={{ color: 'var(--text-primary)' }}>How Much:</strong> {a.how_much_quanto || '-'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Motivo Não Conclusão */}
            {modalMotivoAberto && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Motivo da Não Conclusão</h3>
                            <button onClick={() => setModalMotivoAberto(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Selecione o motivo principal
                            </label>
                            <select 
                                value={motivoSelecionado}
                                onChange={(e) => setMotivoSelecionado(e.target.value)}
                                className="select-field"
                            >
                                <option value="material">Falta de Material</option>
                                <option value="mao_de_obra">Falta de Mão de Obra</option>
                                <option value="projeto">Problema de Projeto</option>
                                <option value="equipamento">Falha em Equipamento</option>
                                <option value="area_frente">Área/Frente Indisponível</option>
                                <option value="clima">Condições Climáticas</option>
                                <option value="planejamento">Erro de Planejamento</option>
                                <option value="terceiros">Atraso de Terceiros</option>
                                <option value="outros">Outros</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setModalMotivoAberto(false)} className="btn-secondary">
                                Cancelar
                            </button>
                            <button onClick={async () => {
                                await updateTarefaStatus(tarefaIdParaMotivo, 'nao_concluida', motivoSelecionado)
                                setModalMotivoAberto(false)

                                // Chain para Nova Restrição
                                const t = tarefas.find(t => t.id === tarefaIdParaMotivo)
                                setNovaRestricao({ 
                                    descricao: getMotivoLabel(motivoSelecionado), 
                                    categoria: ['projeto','material','mao_de_obra','equipamento','area_frente','clima'].includes(motivoSelecionado) ? motivoSelecionado : 'outros', 
                                    responsavel: t?.responsavel || '', 
                                    prazo_remocao: '', 
                                    tarefa_id: tarefaIdParaMotivo 
                                })
                                setIsChainingFlow(true)
                                setActiveTab('restricoes')
                                setShowNovaRestricao(true)
                            }} className="btn-primary">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Ver Motivo */}
            {modalVerMotivoAberto && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Motivo da Não Conclusão</h3>
                            <button onClick={() => setModalVerMotivoAberto(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ marginBottom: '24px', fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            {motivoParaVer}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalVerMotivoAberto(false)} className="btn-primary">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
