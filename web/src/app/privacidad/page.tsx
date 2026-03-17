import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pol\u00edtica de Privacidad \u2014 DentalPrecios',
  description: 'Pol\u00edtica de privacidad y protecci\u00f3n de datos personales de DentalPrecios.',
}

export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
        <span>/</span>
        <span className="text-foreground">Pol&iacute;tica de Privacidad</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Pol&iacute;tica de Privacidad</h1>
      <p className="text-muted-foreground mb-8">
        &Uacute;ltima actualizaci&oacute;n: 16 de marzo de 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">1. Identificaci&oacute;n del responsable</h2>
          <p>
            DentalPrecios (en adelante, &ldquo;la Plataforma&rdquo;) es un servicio de comparaci&oacute;n de precios
            de insumos dentales operado desde Chile. Puedes contactarnos en{' '}
            <a href="mailto:contacto@dentalprecios.cl" className="text-primary hover:underline">
              contacto@dentalprecios.cl
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">2. Datos que recopilamos</h2>
          <p>Recopilamos los siguientes tipos de informaci&oacute;n:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>
              <strong>Datos de registro:</strong> direcci&oacute;n de correo electr&oacute;nico al crear una cuenta,
              utilizada exclusivamente para autenticaci&oacute;n y notificaciones del servicio.
            </li>
            <li>
              <strong>Datos de uso:</strong> informaci&oacute;n an&oacute;nima sobre navegaci&oacute;n, p&aacute;ginas
              visitadas y clics en enlaces de proveedores, recopilada mediante Vercel Analytics y Google Analytics
              con fines de mejora del servicio.
            </li>
            <li>
              <strong>Preferencias del usuario:</strong> productos favoritos, alertas de precio y alertas de stock
              configuradas por el usuario.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">3. Uso de los datos</h2>
          <p>Utilizamos la informaci&oacute;n recopilada para:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Proveer el servicio de comparaci&oacute;n de precios y alertas personalizadas.</li>
            <li>Enviar notificaciones sobre cambios de precio y disponibilidad de productos.</li>
            <li>Analizar el uso de la plataforma para mejorar la experiencia del usuario.</li>
            <li>Generar estad&iacute;sticas agregadas y an&oacute;nimas sobre tendencias de mercado.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">4. Almacenamiento y seguridad</h2>
          <p>
            Los datos personales se almacenan en servidores seguros proporcionados por Supabase
            (infraestructura en la nube con cifrado en tr&aacute;nsito y en reposo). Implementamos
            pol&iacute;ticas de seguridad a nivel de fila (Row Level Security) para garantizar que
            cada usuario solo pueda acceder a sus propios datos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">5. Compartici&oacute;n de datos</h2>
          <p>
            No vendemos, alquilamos ni compartimos tus datos personales con terceros, excepto:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>
              <strong>Proveedores de infraestructura:</strong> Supabase (base de datos), Vercel (hosting)
              y Resend (env&iacute;o de correos), quienes procesan datos seg&uacute;n sus propias pol&iacute;ticas
              de privacidad.
            </li>
            <li>
              <strong>Herramientas de an&aacute;lisis:</strong> Google Analytics recopila datos an&oacute;nimos
              de navegaci&oacute;n.
            </li>
            <li>
              <strong>Obligaciones legales:</strong> cuando sea requerido por ley o por autoridad competente.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">6. Tus derechos</h2>
          <p>
            De acuerdo con la legislaci&oacute;n chilena de protecci&oacute;n de datos personales
            (Ley 19.628), tienes derecho a:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Acceder a tus datos personales almacenados en nuestra plataforma.</li>
            <li>Solicitar la rectificaci&oacute;n de datos incorrectos o desactualizados.</li>
            <li>Solicitar la eliminaci&oacute;n de tus datos personales y tu cuenta.</li>
            <li>Revocar el consentimiento para el tratamiento de tus datos en cualquier momento.</li>
          </ul>
          <p className="mt-2">
            Para ejercer estos derechos, env&iacute;a un correo a{' '}
            <a href="mailto:contacto@dentalprecios.cl" className="text-primary hover:underline">
              contacto@dentalprecios.cl
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">7. Cookies</h2>
          <p>
            Utilizamos cookies esenciales para el funcionamiento del sitio (autenticaci&oacute;n de sesi&oacute;n)
            y cookies de an&aacute;lisis (Google Analytics) para entender c&oacute;mo se utiliza la plataforma.
            Puedes configurar tu navegador para rechazar cookies, aunque esto podr&iacute;a afectar
            el funcionamiento del sitio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">8. Enlaces a terceros</h2>
          <p>
            Nuestra plataforma contiene enlaces a sitios web de proveedores de insumos dentales.
            No somos responsables de las pr&aacute;cticas de privacidad de estos sitios. Te recomendamos
            revisar las pol&iacute;ticas de privacidad de cada proveedor antes de proporcionar
            informaci&oacute;n personal.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">9. Cambios a esta pol&iacute;tica</h2>
          <p>
            Nos reservamos el derecho de actualizar esta pol&iacute;tica de privacidad. Cualquier cambio
            ser&aacute; publicado en esta p&aacute;gina con la fecha de actualizaci&oacute;n correspondiente.
            El uso continuado de la plataforma constituye la aceptaci&oacute;n de los cambios realizados.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">10. Contacto</h2>
          <p>
            Si tienes preguntas sobre esta pol&iacute;tica de privacidad o sobre el tratamiento de tus
            datos personales, puedes contactarnos en{' '}
            <a href="mailto:contacto@dentalprecios.cl" className="text-primary hover:underline">
              contacto@dentalprecios.cl
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
