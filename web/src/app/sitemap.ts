import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAllPosts } from '@/lib/blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.dentalprecios.cl'
  const supabase = await createClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/categorias`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/buscar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/ofertas`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Category pages
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')
    .is('parent_id', null)
    .order('name')

  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((cat) => ({
    url: `${baseUrl}/categorias/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Product pages (batch fetch IDs only)
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .order('name')

  const productPages: MetadataRoute.Sitemap = (products || []).map((p) => ({
    url: `${baseUrl}/producto/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  // Blog posts
  const blogPosts = getAllPosts()
  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  return [...staticPages, ...categoryPages, ...productPages, ...blogPages]
}
