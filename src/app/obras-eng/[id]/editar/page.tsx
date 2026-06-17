import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditarObraClient from './EditarObraClient'

export const dynamic = 'force-dynamic'

export default async function EditarObraPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: obra, error } = await supabase
        .from('obras_eng')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !obra) {
        redirect('/obras-eng')
    }

    return <EditarObraClient obra={obra} />
}
