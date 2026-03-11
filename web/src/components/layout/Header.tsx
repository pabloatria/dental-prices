import Link from 'next/link'
import type { Category } from '@/lib/types'
import SearchWithAutocomplete from '@/components/search/SearchWithAutocomplete'
import CategoryMegaMenu from '@/components/layout/CategoryMegaMenu'
import MobileNav from '@/components/layout/MobileNav'

interface HeaderProps {
  categories: Category[]
}

export default function Header({ categories }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Mobile hamburger */}
        <MobileNav categories={categories} />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c-3 0-5.5 2-6.5 5-1 3 0 7 1 10 1.5 4 3 8 4.5 9 .5.5 1.5.5 2 0 1-1.5 1.5-4 2-7 .5 3 1 5.5 2 7 .5.5 1.5.5 2 0 1.5-1 3-5 4.5-9 1-3 2-7 1-10C23.5 5 21 3 12 3z"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-primary hidden sm:inline">DentalPrecios</span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-2xl">
          <SearchWithAutocomplete />
        </div>

        {/* Account links */}
        <nav className="flex items-center gap-2 shrink-0">
          <Link
            href="/mi-cuenta"
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span>Mi cuenta</span>
          </Link>
        </nav>
      </div>

      {/* Category navigation - desktop only */}
      <div className="hidden lg:block border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <CategoryMegaMenu categories={categories} />
        </div>
      </div>
    </header>
  )
}
