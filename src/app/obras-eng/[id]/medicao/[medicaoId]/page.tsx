import { createServerSupabaseClient } from '@/lib/supabase/server'
import MedicaoClient from './MedicaoClient'
import { redirect } from 'next/navigation'

export default async function MedicaoDetalhePage({ params }: { params: Promise<{ id: string, medicaoId: string }> }) {
    const { id, medicaoId } = await params
    const supabase = await createServerSupabaseClient()

    // 1. Buscar a Medição Atual
    const { data: medicao } = await supabase
        .from('medicoes')
        .select('*')
        .eq('id', medicaoId)
        .single()

    if (!medicao) {
        redirect(`/obras-eng/${id}/medicao`)
    }

    // 2. Buscar o Orçamento da Obra
    const { data: itensOrcamento } = await supabase
        .from('itens_orcamento')
        .select('*')
        .eq('obra_id', id)
        .order('codigo', { ascending: true })

    // 3. Buscar medições ANTERIORES para calcular acumulado (onde data < medicao.periodo_inicio)
    const { data: medicoesAnteriores } = await supabase
        .from('medicoes')
        .select('id')
        .eq('obra_id', id)
        .lt('periodo_inicio', medicao.periodo_inicio)

    const idsAnteriores = medicoesAnteriores?.map(m => m.id) || []

    let medicaoItensAnteriores: any[] = []
    if (idsAnteriores.length > 0) {
        const { data } = await supabase
            .from('medicao_itens')
            .select('*')
            .in('medicao_id', idsAnteriores)
        medicaoItensAnteriores = data || []
    }

    // 4. Buscar os itens da medição ATUAL
    const { data: medicaoItensAtual } = await supabase
        .from('medicao_itens')
        .select('*')
        .eq('medicao_id', medicaoId)

    // Compilar dados para o Client Component
    const dadosTabela = itensOrcamento?.map(item => {
        // Acumulado Anterior
        const anterioresDoItem = medicaoItensAnteriores.filter(m => m.item_id === item.id)
        const qtdAnterior = anterioresDoItem.reduce((acc, curr) => acc + (curr.quantidade_medida || 0), 0)
        const valorAnterior = anterioresDoItem.reduce((acc, curr) => acc + (curr.valor_medido || 0), 0)

        // Atual
        const atual = medicaoItensAtual?.find(m => m.item_id === item.id)

        return {
            ...item,
            anterior_quantidade: qtdAnterior,
            anterior_valor: valorAnterior,
            atual_id: atual?.id || null, // Se já foi salva no banco
            atual_quantidade: atual?.quantidade_medida || 0,
            atual_valor: atual?.valor_medido || 0,
            atual_percentual: atual?.percentual_medido || 0,
        }
    }) || []

    return (
        <MedicaoClient 
            obraId={id} 
            medicao={medicao} 
            dadosTabela={dadosTabela} 
        />
    )
}
