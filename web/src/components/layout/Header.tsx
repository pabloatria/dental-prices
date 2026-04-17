import Link from 'next/link'
import Image from 'next/image'
import type { Category } from '@/lib/types'
import SearchWithAutocomplete from '@/components/search/SearchWithAutocomplete'
import CategoryMegaMenu from '@/components/layout/CategoryMegaMenu'
import MobileNav from '@/components/layout/MobileNav'
import CartIcon from '@/components/layout/CartIcon'

interface HeaderProps {
  categories: Category[]
}

export default function Header({ categories }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-4">
        {/* Mobile hamburger */}
        <MobileNav categories={categories} />

        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png"
            alt="DentalPrecios"
            width={165}
            height={50}
            className="h-8 sm:h-10 w-auto"
            priority
          />
        </Link>

        {/* Search bar */}
        <div className="flex-1 min-w-0 max-w-2xl">
          <SearchWithAutocomplete />
        </div>

        {/* Account links */}
        <nav className="flex items-center gap-2 shrink-0">
          <CartIcon />
          <Link
            href="/blog"
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5" />
            </svg>
            <span>Blog</span>
          </Link>
          <Link
            href="/suscripcion"
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <span>Alertas</span>
          </Link>
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
