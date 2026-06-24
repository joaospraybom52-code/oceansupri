import { createServerSupabaseClient } from '@/lib/supabase/server'
import HistogramaClient from './HistogramaClient'
import { getPapelObras, podeCriarMedProg } from '@/lib/utils/obras-access'

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

    return <HistogramaClient obraId={id} initialSemanas={semanas || []} podeEditar={podeEditar} />
}
