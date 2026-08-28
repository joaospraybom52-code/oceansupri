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

    // 3. Acumulado anterior = medições CONCLUÍDAS que vêm antes desta (por período;
    //    em empate de período, pela data de criação). Só medições concluídas contam
    //    como já medido — assim uma nova medição do mesmo período enxerga o que a
    //    concluída anterior já mediu e o saldo baixa corretamente.
    const { data: todasMedicoes } = await supabase
        .from('medicoes')
        .select('id, periodo_inicio, created_at, status, tipo, valor_sinal, desconto_sinal_percentual')
        .eq('obra_id', id)
    const todasMedicoes2 = todasMedicoes as unknown as {
        id: string; periodo_inicio: string; created_at: string | null; status: string
        tipo: string | null; valor_sinal: number | null; desconto_sinal_percentual: number | null
    }[] | null

    const idsAnteriores = (todasMedicoes || [])
        .filter(m => m.id !== medicaoId && m.status === 'Concluída' && (
            m.periodo_inicio < medicao.periodo_inicio ||
            (m.periodo_inicio === medicao.periodo_inicio && (m.created_at || '') < (medicao.created_at || ''))
        ))
        .map(m => m.id)

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

    // ── Sinal da obra e quanto dele já foi devolvido.
    //    O sinal é adiantamento: cada medição amortiza um % dele, e o desconto
    //    nunca pode passar do que ainda falta devolver.
    const sinalTotal = (todasMedicoes2 ?? [])
        .filter(m => m.tipo === 'sinal')
        .reduce((s, m) => s + Number(m.valor_sinal || 0), 0)

    // Quanto as OUTRAS medições já descontaram (o % de cada uma sobre o que ela mediu)
    let sinalJaAmortizado = 0
    if (sinalTotal > 0) {
        const outras = (todasMedicoes2 ?? []).filter(m => m.id !== medicaoId && m.tipo !== 'sinal' && Number(m.desconto_sinal_percentual || 0) > 0)
        if (outras.length > 0) {
            const { data: itensOutras } = await supabase
                .from('medicao_itens').select('medicao_id, valor_medido').in('medicao_id', outras.map(m => m.id))
            for (const m of outras) {
                const medido = (itensOutras ?? [])
                    .filter(i => i.medicao_id === m.id)
                    .reduce((s, i) => s + Number(i.valor_medido || 0), 0)
                sinalJaAmortizado += medido * (Number(m.desconto_sinal_percentual || 0) / 100)
            }
        }
    }

    const podeEditar = podeCriarMedProg(await getPapelObras())

    return (
        <MedicaoClient
            obraId={id}
            medicao={medicao}
            dadosTabela={dadosTabela}
            podeEditar={podeEditar}
            sinalTotal={sinalTotal}
            sinalJaAmortizado={Math.round((sinalJaAmortizado + Number.EPSILON) * 100) / 100}
        />
    )
}
