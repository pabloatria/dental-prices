import type { Metadata } from 'next'

const BASE_URL = 'https://www.dentalprecios.cl'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description:
    'Inicia sesión o crea una cuenta en DentalPrecios para guardar favoritos, activar alertas de precio y comparar insumos dentales en Chile.',
  alternates: { canonical: `${BASE_URL}/ingresar` },
  robots: { index: false, follow: false },
}

export default function IngresarLayout({ children }: { children: React.ReactNode }) {
  return children
}
