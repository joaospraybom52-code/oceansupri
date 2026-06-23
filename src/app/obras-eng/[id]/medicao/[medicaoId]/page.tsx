import { createServerSupabaseClient } from '@/lib/supabase/server'
import MedicaoClient from './MedicaoClient'
import { redirect } from 'next/navigation'
import { getPapelObras, podeCriarMedProg } from '@/lib/utils/obras-access'

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

        // Se o valor_medido é 0 ou null, mas temos quantidade_medida, vamos calcular para evitar inconsistências no banco
        const qtyMedida = Number(atual?.quantidade_medida || 0)
        let valorMedido = Number(atual?.valor_medido || 0)
        if (qtyMedida > 0 && valorMedido === 0) {
            const qtyOrcada = Number(item.quantidade_orcada || 0)
            const valTotalOrcado = Number(item.valor_total_orcado || 0)
            valorMedido = qtyOrcada > 0 ? (qtyMedida / qtyOrcada) * valTotalOrcado : 0
        }

        return {
            ...item,
            anterior_quantidade: qtdAnterior,
            anterior_valor: valorAnterior,
            atual_id: atual?.id || null, // Se já foi salva no banco
            atual_quantidade: qtyMedida,
            atual_valor: valorMedido,
            atual_percentual: Number(atual?.percentual_medido || 0),
        }
    }) || []

    const podeEditar = podeCriarMedProg(await getPapelObras())

    return (
        <MedicaoClient
            obraId={id}
            medicao={medicao}
            dadosTabela={dadosTabela}
            podeEditar={podeEditar}
        />
    )
}
