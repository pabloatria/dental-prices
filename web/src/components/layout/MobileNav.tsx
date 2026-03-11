'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { Category } from '@/lib/types'
import { getCategoryIcon } from '@/components/icons/CategoryIllustrations'

export default function MobileNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle className="text-left">
              <span className="text-primary font-bold">DentalPrecios</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Inicio
            </Link>

            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
              Categor&iacute;as
            </div>

            {categories.map((category) => {
              const Icon = getCategoryIcon(category.slug)
              return (
                <Link
                  key={category.id}
                  href={`/categorias/${category.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-accent transition-colors"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  {category.name}
                </Link>
              )
            })}

            <div className="border-t border-border my-4" />

            <Link
              href="/mi-cuenta"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              Mi cuenta
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}
