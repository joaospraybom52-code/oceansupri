import { redirect } from 'next/navigation'

export default function ObraRootPage({ params }: { params: { id: string } }) {
    // Redireciona a raiz da obra para o dashboard (Resumo)
    redirect(`/obras-eng/${params.id}/dashboard`)
}
