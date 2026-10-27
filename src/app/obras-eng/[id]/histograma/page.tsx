import { createServerSupabaseClient } from '@/lib/supabase/server'
import HistogramaClient from './HistogramaClient'
import { getPapelObras, podeCriarMedProg, podeEditarPlanejamento } from '@/lib/utils/obras-access'

export const dynamic = 'force-dynamic'

export default async function HistogramaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data: semanas } = await supabase
        .from('histograma_semanas' as any)
        .select('*')
        .eq('obra_id', id)
        .order('semana_ref', { ascending: true })

    const podeEditar = podeCriarMedProg(await getPapelObras())
    // O PREVISTO é planejamento: só admin ou perfil Planejamento mexem nele.
    // O realizado segue liberado para quem edita a obra.
    const podeEditarPrevisto = await podeEditarPlanejamento()

    return <HistogramaClient obraId={id} initialSemanas={semanas || []} podeEditar={podeEditar} podeEditarPrevisto={podeEditarPrevisto} />
}
