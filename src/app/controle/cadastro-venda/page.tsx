import { createServerSupabaseClient } from '@/lib/supabase/server'
import CadastroVendaClient from '@/components/controle/CadastroVendaClient'

export const dynamic = 'force-dynamic'

export default async function CadastroVendaPage() {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    let podeEditar = false
    if (user?.email) {
        const { data: perm } = await supabase
            .from('permissao_modulocontrole')
            .select('pode_editar')
            .eq('email', user.email)
            .maybeSingle()
        podeEditar = perm?.pode_editar ?? false
    }

    const { data: vendas } = await supabase
        .from('controle_vgv')
        .select('id, codigo_obra, ano, nome_obra, cliente, valor_venda')
        .order('codigo_obra', { ascending: true })

    return <CadastroVendaClient vendasIniciais={(vendas as any) ?? []} podeEditar={podeEditar} />
}
