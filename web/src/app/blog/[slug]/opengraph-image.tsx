import { ImageResponse } from 'next/og'
import { getPostBySlug, getAllPosts } from '@/lib/blog'

export const alt = 'DentalPrecios Blog'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  const title = post?.title ?? 'Blog | DentalPrecios'
  const description = post?.description ?? ''
  const date = post
    ? new Date(post.date).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 70px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top: badge + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              padding: '6px 16px',
              background: '#0ea5e9',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            BLOG
          </div>
          {date && (
            <div style={{ display: 'flex', color: '#94a3b8', fontSize: '18px' }}>
              {date}
            </div>
          )}
        </div>

        {/* Center: title + description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 80 ? 36 : title.length > 50 ? 42 : 48,
              fontWeight: 800,
              color: '#f8fafc',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                color: '#94a3b8',
                lineHeight: 1.4,
                maxWidth: '900px',
              }}
            >
              {description.length > 140
                ? description.slice(0, 137) + '...'
                : description}
            </div>
          )}
        </div>

        {/* Bottom: branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#0ea5e9',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '22px',
                fontWeight: 800,
              }}
            >
              D
            </div>
            <div style={{ display: 'flex', color: '#e2e8f0', fontSize: '22px', fontWeight: 700 }}>
              dentalprecios.cl
            </div>
          </div>
          <div style={{ display: 'flex', color: '#64748b', fontSize: '16px' }}>
            Compara precios de insumos dentales en Chile
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
