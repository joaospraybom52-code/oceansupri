import { createServerSupabaseClient } from '@/lib/supabase/server'
import CurvaSClient from './CurvaSClient'
import { getPapelObras, podeCriarMedProg, podeEditarLinhaBase as checarLinhaBase } from '@/lib/utils/obras-access'

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

    // Linha de Base: segue o NÍVEL DE ACESSO (admin ou Planejamento), e não uma
    // lista de e-mails — assim basta cadastrar a pessoa como Planejamento na aba
    // Cadastro de usuários.
    // Incluir/alterar/excluir SEMANA também é planejamento — quem só tem acesso
    // de Engenharia/Obras preenche o Real das semanas já cadastradas.
    const podeEditarLinhaBase = await checarLinhaBase()

    return <CurvaSClient obraId={id} initialSemanas={semanas || []} podeEditar={podeEditar} podeEditarLinhaBase={podeEditarLinhaBase} podeGerenciarSemanas={podeEditarLinhaBase} />
}
