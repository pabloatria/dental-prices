import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const DIR = path.join(process.cwd(), 'content/comparaciones')

export interface Comparacion {
  slug: string
  title: string
  description: string
  date: string
  author: string
  keywords: string[]
  category: string
  brands: string[]
  content: string
}

export function getAllComparaciones(): Comparacion[] {
  if (!fs.existsSync(DIR)) return []

  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((filename) => {
      const slug = filename.replace('.mdx', '')
      const raw = fs.readFileSync(path.join(DIR, filename), 'utf-8')
      const { data, content } = matter(raw)
      return {
        slug,
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        author: data.author || 'DentalPrecios',
        keywords: data.keywords || [],
        category: data.category || '',
        brands: data.brands || [],
        draft: data.draft === true,
        content,
      }
    })
    .filter((c) => !c.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getComparacionBySlug(slug: string): Comparacion | null {
  const filePath = path.join(DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  return {
    slug,
    title: data.title || '',
    description: data.description || '',
    date: data.date || '',
    author: data.author || 'DentalPrecios',
    keywords: data.keywords || [],
    category: data.category || '',
    brands: data.brands || [],
    content,
  }
}
