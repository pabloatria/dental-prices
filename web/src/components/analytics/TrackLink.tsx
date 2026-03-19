'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

export default function TrackLink({
  href,
  eventName,
  eventParams,
  children,
  className,
}: {
  href: string
  eventName: string
  eventParams?: Record<string, any>
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackEvent(eventName, eventParams)}
    >
      {children}
    </Link>
  )
}
