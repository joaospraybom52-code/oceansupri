import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Suprimentos CW | Gestão de Compras para Construção Civil',
  description: 'Sistema de gestão e planejamento de suprimentos para a construção civil. Acompanhe pedidos, cotações, entregas e KPIs em tempo real.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
