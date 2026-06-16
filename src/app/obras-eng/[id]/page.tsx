import { redirect } from 'next/navigation'

export default async function ObraRootPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    // Redireciona a raiz da obra para o dashboard (Resumo)
    redirect(`/obras-eng/${id}/dashboard`)
}
