import { createServerSupabaseClient } from '@/lib/supabase/server'
import CurvaSClient from './CurvaSClient'
import { getPapelObras, podeCriarMedProg } from '@/lib/utils/obras-access'

export const dynamic = 'force-dynamic'

export default async function CurvaSPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data: semanas } = await supabase
        .from('curva_s_semanas' as any)
        .select('*')
        .eq('obra_id', id)
        .order('semana_ref', { ascending: true })

    const podeEditar = podeCriarMedProg(await getPapelObras())

    // Linha de Base: só estes usuários podem preencher/alterar
    const EDITORES_LINHA_BASE = ['engjoao@constrowins.eng.br', 'planejamento@constrowins.eng.br']
    const { data: { user } } = await supabase.auth.getUser()
    const podeEditarLinhaBase = podeEditar && EDITORES_LINHA_BASE.includes((user?.email || '').toLowerCase())

    return <CurvaSClient obraId={id} initialSemanas={semanas || []} podeEditar={podeEditar} podeEditarLinhaBase={podeEditarLinhaBase} />
}
