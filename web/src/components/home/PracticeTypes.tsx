'use client'

import { useState } from 'react'
import Link from 'next/link'

interface PracticeType {
  name: string
  categorySlugs: string[]
}

const practiceTypes: PracticeType[] = [
  {
    name: 'Odontología General',
    categorySlugs: [
      'resinas-compuestas',
      'cementos-adhesivos',
      'acabado-pulido',
      'fresas-diamantes',
      'materiales-impresion',
      'instrumental',
      'matrices-cunas',
      'materiales-retraccion',
    ],
  },
  {
    name: 'Ortodoncia',
    categorySlugs: ['ortodoncia'],
  },
  {
    name: 'Periodoncia',
    categorySlugs: ['instrumental', 'cirugia', 'anestesia'],
  },
  {
    name: 'Cirugía Oral',
    categorySlugs: ['cirugia', 'anestesia', 'jeringas-agujas'],
  },
  {
    name: 'Prostodoncia',
    categorySlugs: [
      'coronas-cofias',
      'materiales-impresion',
      'pernos-postes',
      'cad-cam',
      'ceras',
    ],
  },
  {
    name: 'Endodoncia',
    categorySlugs: ['endodoncia', 'goma-dique', 'instrumental'],
  },
  {
    name: 'Odontología Estética',
    categorySlugs: ['estetica', 'resinas-compuestas', 'acabado-pulido'],
  },
  {
    name: 'Odontopediatría',
    categorySlugs: ['preventivos', 'coronas-cofias', 'anestesia'],
  },
]

export default function PracticeTypes() {
  const [selected, setSelected] = useState<string | null>(null)

  const active = practiceTypes.find((p) => p.name === selected)

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
          {/* Left text */}
          <div className="shrink-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Compra más inteligente
            </h2>
            <p className="text-muted-foreground mt-1">
              Selecciona tu especialidad para ver las categorías relevantes
            </p>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2">
            {practiceTypes.map((pt) => (
              <button
                key={pt.name}
                onClick={() =>
                  setSelected(selected === pt.name ? null : pt.name)
                }
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  selected === pt.name
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-primary border-primary/30 hover:border-primary hover:bg-primary/5'
                }`}
              >
                {pt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category links - shown when a practice type is selected */}
        {active && (
          <div className="mt-6 flex flex-wrap gap-2 animate-in fade-in duration-200">
            {active.categorySlugs.map((slug) => (
              <Link
                key={slug}
                href={`/categorias/${slug}`}
                className="px-3 py-1.5 rounded-lg text-sm bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {slugToName(slug)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function slugToName(slug: string): string {
  const map: Record<string, string> = {
    'resinas-compuestas': 'Resinas compuestas',
    'cementos-adhesivos': 'Cementos y adhesivos',
    'acabado-pulido': 'Acabado y pulido',
    'fresas-diamantes': 'Fresas y diamantes',
    'materiales-impresion': 'Materiales de impresión',
    instrumental: 'Instrumental',
    'matrices-cunas': 'Matrices y cuñas',
    'materiales-retraccion': 'Materiales de retracción',
    ortodoncia: 'Ortodoncia',
    cirugia: 'Cirugía',
    anestesia: 'Anestesia',
    'jeringas-agujas': 'Jeringas y agujas',
    'coronas-cofias': 'Coronas y cofias',
    'pernos-postes': 'Pernos y postes',
    'cad-cam': 'CAD CAM',
    ceras: 'Ceras',
    endodoncia: 'Endodoncia',
    'goma-dique': 'Goma dique',
    estetica: 'Odontología estética',
    preventivos: 'Preventivos',
  }
  return map[slug] || slug
}
