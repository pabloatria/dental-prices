'use client'

import { useState } from 'react'

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

const PROPERTY_LABELS: Record<string, string> = {
  curing_time: 'Tiempo de fotocurado',
  // Mechanical
  resistencia_compresiva: 'Resistencia compresiva',
  resistencia_flexural: 'Resistencia flexural',
  modulo_elasticidad: 'Módulo de elasticidad',
  dureza_vickers: 'Dureza Vickers',
  dureza_knoop: 'Dureza Knoop',
  resistencia_traccion: 'Resistencia a la tracción',
  resistencia_desgaste: 'Resistencia al desgaste',
  tenacidad_fractura: 'Tenacidad a la fractura',
  compressive_strength: 'Resistencia compresiva',
  flexural_strength: 'Resistencia flexural',
  bond_strength: 'Fuerza de adhesión',
  // Optical / Shades
  numero_tonos: 'Número de tonos',
  opciones_tonos: 'Tonos disponibles',
  opacidad_translucidez: 'Opacidad/Translucidez',
  fluorescencia: 'Fluorescencia',
  efecto_camaleon: 'Efecto camaleón',
  shade_options: 'Opciones de color',
  // Working
  tiempo_trabajo: 'Tiempo de trabajo',
  tiempo_fraguado: 'Tiempo de fraguado',
  tiempo_curado: 'Tiempo de curado',
  tiempo_polimerizacion: 'Tiempo de polimerización',
  profundidad_curado: 'Profundidad de curado',
  contraccion_polimerizacion: 'Contracción de polimerización',
  espesor_pelicula: 'Espesor de película',
  viscosidad: 'Viscosidad',
  radiopacidad: 'Radiopacidad',
  liberacion_fluor: 'Liberación de flúor',
  working_time: 'Tiempo de trabajo',
  setting_time: 'Tiempo de fraguado',
  curing_time: 'Tiempo de curado',
  depth_of_cure: 'Profundidad de curado',
  film_thickness: 'Espesor de película',
  shrinkage: 'Contracción',
  filler_content: 'Contenido de relleno',
  fluoride_release: 'Liberación de flúor',
  // Physical
  absorcion_agua: 'Absorción de agua',
  solubilidad: 'Solubilidad',
  estabilidad_dimensional: 'Estabilidad dimensional',
  densidad: 'Densidad',
  // Presentation
  presentacion: 'Presentación',
  contenido: 'Contenido',
  vida_util: 'Vida útil',
  almacenamiento: 'Almacenamiento',
  shelf_life: 'Vida útil',
  storage: 'Almacenamiento',
  volume: 'Volumen',
  concentration: 'Concentración',
  ph: 'pH',
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(properties).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2 py-1">
                <span className="text-foreground/70">{PROPERTY_LABELS[key] || key.replace(/_/g, ' ')}</span>
                <span className="text-foreground font-medium text-right">{value}</span>
              </div>
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
