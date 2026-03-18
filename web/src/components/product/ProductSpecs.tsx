'use client'

import { useState, useRef, useEffect } from 'react'

interface ProductSpec {
  composition: string | null
  indications: string | null
  contraindications: string | null
  technique_tips: string | null
  properties: Record<string, string> | null
  compatible_products: string | null
  comparison_notes: string | null
  ai_generated: boolean
  reviewed: boolean
}

interface Props {
  spec: ProductSpec
}

interface PropertyInfo {
  label: string
  definition: string
  relevance: string
}

const PROPERTY_INFO: Record<string, PropertyInfo> = {
  // Mechanical
  resistencia_compresiva: {
    label: 'Resistencia compresiva',
    definition: 'Capacidad del material para soportar fuerzas de compresión sin fracturarse. Se mide en megapascales (MPa).',
    relevance: 'Fundamental en restauraciones posteriores que reciben cargas masticatorias directas. Valores altos (>300 MPa) son ideales para molares.',
  },
  resistencia_flexural: {
    label: 'Resistencia flexural',
    definition: 'Capacidad del material para resistir deformación bajo carga antes de fracturarse. Se mide en MPa.',
    relevance: 'Indica la durabilidad clínica del material. La ISO 4049 exige mínimo 80 MPa para restauraciones posteriores. Valores >100 MPa ofrecen mejor rendimiento a largo plazo.',
  },
  modulo_elasticidad: {
    label: 'Módulo de elasticidad',
    definition: 'Rigidez del material — cuánto se deforma bajo una carga dada. Se mide en gigapascales (GPa).',
    relevance: 'Un módulo similar al de la dentina (~18 GPa) permite una distribución de tensiones más uniforme y reduce el riesgo de fractura del diente.',
  },
  dureza_vickers: {
    label: 'Dureza Vickers',
    definition: 'Resistencia a la indentación superficial medida con un penetrador de diamante piramidal.',
    relevance: 'Se relaciona con la resistencia al desgaste. Valores cercanos al esmalte (~340 VHN) son ideales para evitar desgaste diferencial con dientes antagonistas.',
  },
  dureza_knoop: {
    label: 'Dureza Knoop',
    definition: 'Similar a Vickers pero usa un penetrador más alargado. Útil para materiales frágiles o películas delgadas.',
    relevance: 'Permite evaluar la polimerización en profundidad: una dureza de fondo >80% de la superficie indica curado adecuado.',
  },
  resistencia_traccion: {
    label: 'Resistencia a la tracción',
    definition: 'Fuerza máxima que soporta el material al ser estirado antes de romperse.',
    relevance: 'Importante en márgenes de restauraciones donde se generan tensiones de tracción por la contracción de polimerización.',
  },
  resistencia_desgaste: {
    label: 'Resistencia al desgaste',
    definition: 'Capacidad de mantener la superficie sin pérdida de material por fricción.',
    relevance: 'Determina la longevidad de la restauración y el mantenimiento de la anatomía oclusal con el tiempo.',
  },
  tenacidad_fractura: {
    label: 'Tenacidad a la fractura',
    definition: 'Energía necesaria para propagar una grieta existente en el material. Se mide en MPa·m½.',
    relevance: 'Indica la resistencia a la propagación de microgrietas. Valores altos significan menor riesgo de fractura catastrófica.',
  },
  fuerza_adhesion: {
    label: 'Fuerza de adhesión',
    definition: 'Resistencia de la unión entre el material adhesivo y la estructura dental. Se mide en MPa.',
    relevance: 'Valores >20 MPa en dentina y >30 MPa en esmalte se consideran clínicamente adecuados para restauraciones duraderas.',
  },
  // Optical / Shades
  numero_tonos: {
    label: 'Número de tonos',
    definition: 'Cantidad de colores disponibles en el sistema del producto.',
    relevance: 'Mayor variedad permite mejor mimetismo con el diente natural, especialmente en zona estética anterior.',
  },
  opciones_tonos: {
    label: 'Tonos disponibles',
    definition: 'Lista de los colores específicos ofrecidos, generalmente siguiendo la guía VITA.',
    relevance: 'Permite planificar la estratificación y seleccionar tonos para dentina, esmalte y efectos especiales.',
  },
  opacidad_translucidez: {
    label: 'Opacidad/Translucidez',
    definition: 'Grado en que el material permite o bloquea el paso de luz.',
    relevance: 'Esmalte natural es translúcido, dentina es más opaca. Combinar capas correctamente logra resultados estéticos naturales.',
  },
  fluorescencia: {
    label: 'Fluorescencia',
    definition: 'Emisión de luz visible cuando el material es expuesto a luz ultravioleta.',
    relevance: 'Los dientes naturales son fluorescentes. Un material con fluorescencia se verá natural incluso bajo luz UV (discotecas, luz negra).',
  },
  efecto_camaleon: {
    label: 'Efecto camaleón',
    definition: 'Capacidad del material de tomar el color de las estructuras dentales adyacentes.',
    relevance: 'Simplifica la selección de color y mejora la integración estética, especialmente útil en cavidades pequeñas.',
  },
  // Working
  tiempo_trabajo: {
    label: 'Tiempo de trabajo',
    definition: 'Tiempo disponible para manipular el material antes de que comience a endurecer.',
    relevance: 'Debe ser suficiente para posicionar y adaptar el material correctamente. Muy corto genera estrés clínico, muy largo alarga el procedimiento.',
  },
  tiempo_fraguado: {
    label: 'Tiempo de fraguado',
    definition: 'Tiempo total que tarda el material en alcanzar su dureza inicial después de mezclado.',
    relevance: 'Determina cuánto debe esperar el paciente antes de que se pueda continuar con el procedimiento o retirar la impresión.',
  },
  tiempo_curado: {
    label: 'Tiempo de curado',
    definition: 'Tiempo de exposición a la lámpara de fotocurado necesario para polimerizar el material.',
    relevance: 'Un curado insuficiente reduce propiedades mecánicas y aumenta citotoxicidad por monómero residual. Seguir las indicaciones del fabricante.',
  },
  tiempo_polimerizacion: {
    label: 'Tiempo de polimerización',
    definition: 'Duración del proceso de endurecimiento del material por reacción química o lumínica.',
    relevance: 'Afecta directamente el flujo de trabajo clínico y las propiedades finales del material.',
  },
  profundidad_curado: {
    label: 'Profundidad de curado',
    definition: 'Profundidad máxima a la que la luz logra polimerizar adecuadamente el material. Se mide en mm.',
    relevance: 'Determina el espesor máximo de cada incremento. Capas mayores a la profundidad de curado quedarán parcialmente polimerizadas.',
  },
  contraccion_polimerizacion: {
    label: 'Contracción de polimerización',
    definition: 'Reducción volumétrica del material durante el endurecimiento. Se expresa en porcentaje.',
    relevance: 'La contracción genera tensión en la interfaz diente-restauración, pudiendo causar brechas marginales, sensibilidad y caries secundaria. Valores <2% son preferibles.',
  },
  espesor_pelicula: {
    label: 'Espesor de película',
    definition: 'Grosor mínimo que forma el material cuando se aplica entre dos superficies bajo presión. Se mide en µm.',
    relevance: 'Para cementos, un espesor <25 µm permite el asentamiento completo de restauraciones indirectas sin interferencias oclusales.',
  },
  viscosidad: {
    label: 'Viscosidad',
    definition: 'Resistencia del material a fluir. Puede ser baja (fluida), media o alta (condensable).',
    relevance: 'Baja viscosidad penetra mejor en fisuras y socavados. Alta viscosidad permite esculpir anatomía sin escurrimiento.',
  },
  radiopacidad: {
    label: 'Radiopacidad',
    definition: 'Capacidad del material de aparecer visible en radiografías, generalmente expresada en mm de aluminio equivalente.',
    relevance: 'Permite distinguir la restauración del diente y detectar caries secundaria en radiografías de control.',
  },
  liberacion_fluor: {
    label: 'Liberación de flúor',
    definition: 'Capacidad del material de liberar iones de flúor al medio oral de forma sostenida.',
    relevance: 'Tiene efecto anticariogénico local, especialmente útil en pacientes de alto riesgo de caries y en odontopediatría.',
  },
  contenido_relleno: {
    label: 'Contenido de relleno',
    definition: 'Proporción de partículas inorgánicas (sílice, vidrio, zirconia) en el material. Se expresa en % peso o volumen.',
    relevance: 'Mayor contenido de relleno generalmente mejora resistencia mecánica y reduce contracción, pero puede afectar el pulido.',
  },
  // Physical
  absorcion_agua: {
    label: 'Absorción de agua',
    definition: 'Cantidad de agua que absorbe el material en el medio oral. Se mide en µg/mm³.',
    relevance: 'La absorción excesiva puede causar expansión, degradación y cambio de color de la restauración.',
  },
  solubilidad: {
    label: 'Solubilidad',
    definition: 'Cantidad de material que se disuelve en el medio oral. Se mide en µg/mm³.',
    relevance: 'Alta solubilidad acelera la degradación del material y puede generar brechas marginales con el tiempo.',
  },
  estabilidad_dimensional: {
    label: 'Estabilidad dimensional',
    definition: 'Capacidad del material de mantener sus dimensiones originales sin deformarse.',
    relevance: 'Crítica en materiales de impresión para garantizar la precisión de modelos y restauraciones indirectas.',
  },
  densidad: {
    label: 'Densidad',
    definition: 'Masa por unidad de volumen del material. Se mide en g/cm³.',
    relevance: 'Afecta el peso final de la restauración y puede influir en la radiopacidad del material.',
  },
  ph: {
    label: 'pH',
    definition: 'Nivel de acidez o alcalinidad del material.',
    relevance: 'pH bajo en adhesivos autocondicionantes determina su capacidad de desmineralizar el sustrato dental. Muy ácido puede afectar la unión a dentina profunda.',
  },
  // Presentation
  presentacion: {
    label: 'Presentación',
    definition: 'Forma de empaque y cantidad del producto.',
    relevance: 'Determina el costo por uso y la conveniencia de almacenamiento en la clínica.',
  },
  contenido: {
    label: 'Contenido',
    definition: 'Elementos incluidos en el empaque del producto.',
    relevance: 'Permite saber si se necesitan accesorios adicionales o si el kit viene completo para uso inmediato.',
  },
  vida_util: {
    label: 'Vida útil',
    definition: 'Tiempo durante el cual el producto mantiene sus propiedades si se almacena correctamente.',
    relevance: 'Importante para la gestión de inventario en la clínica y para evitar usar material degradado.',
  },
  almacenamiento: {
    label: 'Almacenamiento',
    definition: 'Condiciones requeridas para conservar el producto (temperatura, luz, humedad).',
    relevance: 'Almacenamiento incorrecto puede degradar el material prematuramente y afectar su rendimiento clínico.',
  },
  concentracion: {
    label: 'Concentración',
    definition: 'Proporción del principio activo en el producto.',
    relevance: 'En blanqueamiento, mayor concentración implica resultados más rápidos pero también mayor riesgo de sensibilidad.',
  },
}

function PropertyTooltip({
  propertyKey,
  label,
  value,
}: {
  propertyKey: string
  label: string
  value: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const info = PROPERTY_INFO[propertyKey]

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="flex justify-between gap-2 py-1 relative">
      <button
        onClick={() => info && setOpen(!open)}
        className={`text-left ${info ? 'text-foreground/70 hover:text-primary underline decoration-dotted underline-offset-2 cursor-help' : 'text-foreground/70'}`}
      >
        {label}
      </button>
      <span className="text-foreground font-medium text-right">{value}</span>

      {open && info && (
        <div className="absolute left-0 top-full mt-1 z-50 w-80 bg-white border border-border rounded-lg shadow-lg p-4 text-sm animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-foreground">{info.label}</h4>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-muted-foreground mb-2">{info.definition}</p>
          <div className="border-t border-border pt-2">
            <p className="text-xs font-medium text-primary/80 mb-0.5">Relevancia clínica</p>
            <p className="text-muted-foreground text-xs">{info.relevance}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-accent/50 transition-colors rounded"
      >
        <span className="font-medium text-foreground">{title}</span>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="pb-4 px-1 text-sm text-muted-foreground leading-relaxed">{children}</div>}
    </div>
  )
}

export default function ProductSpecs({ spec }: Props) {
  const properties = spec.properties || {}

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-foreground">Información técnica</h2>
        {spec.ai_generated && !spec.reviewed && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Generado con IA
          </span>
        )}
      </div>

      {spec.composition && (
        <Section title="Composición" defaultOpen>
          <p>{spec.composition}</p>
        </Section>
      )}

      {Object.keys(properties).length > 0 && (
        <Section title="Propiedades técnicas" defaultOpen>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {Object.entries(properties).map(([key, value]) => (
              <PropertyTooltip
                key={key}
                propertyKey={key}
                label={PROPERTY_INFO[key]?.label || key.replace(/_/g, ' ')}
                value={value}
              />
            ))}
          </div>
        </Section>
      )}

      {spec.indications && (
        <Section title="Indicaciones">
          <p>{spec.indications}</p>
        </Section>
      )}

      {spec.contraindications && (
        <Section title="Contraindicaciones">
          <p>{spec.contraindications}</p>
        </Section>
      )}

      {spec.technique_tips && (
        <Section title="Tips clínicos">
          <p>{spec.technique_tips}</p>
        </Section>
      )}

      {spec.compatible_products && (
        <Section title="Productos compatibles">
          <p>{spec.compatible_products}</p>
        </Section>
      )}

      {spec.comparison_notes && (
        <Section title="Comparación con alternativas">
          <p>{spec.comparison_notes}</p>
        </Section>
      )}
    </div>
  )
}
