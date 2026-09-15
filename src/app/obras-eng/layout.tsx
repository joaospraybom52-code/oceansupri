import { getPapelObras, podeAdminObra } from '@/lib/utils/obras-access'
import ObrasNav from './ObrasNav'

export default async function ObrasLayout({ children }: { children: React.ReactNode }) {
    // O papel decide se a aba "Obras diretoria" aparece no menu. A página dela
    // repete a conferência — o menu é só a vitrine.
    const isAdmin = podeAdminObra(await getPapelObras())
    return <ObrasNav isAdmin={isAdmin}>{children}</ObrasNav>
}
