'use client'

import Link from 'next/link'
import type { Category } from '@/lib/types'
import { getCategoryIcon } from '@/components/icons/CategoryIllustrations'

export default function CategoryMegaMenu({ categories }: { categories: Category[] }) {
  return (
    <nav className="flex items-center gap-1 py-1 overflow-x-auto scrollbar-hide">
      <Link
        href="/categorias"
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors whitespace-nowrap"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
        </svg>
        Todas
      </Link>
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.slug)
        return (
          <Link
            key={category.id}
            href={`/categorias/${category.slug}`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors whitespace-nowrap"
          >
            <Icon className="w-4 h-4" />
            {category.name}
          </Link>
        )
      })}
    </nav>
  )
}
