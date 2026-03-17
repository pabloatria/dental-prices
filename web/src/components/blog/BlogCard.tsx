import Link from 'next/link'
import type { BlogPost } from '@/lib/blog'

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block bg-card rounded-xl border border-border p-6 hover:shadow-md hover:border-primary/20 transition-all"
    >
      <time className="text-xs text-muted-foreground">
        {new Date(post.date).toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </time>
      <h2 className="mt-2 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
        {post.title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
        {post.description}
      </p>
      <span className="mt-4 inline-block text-sm font-medium text-primary">
        Leer artículo →
      </span>
    </Link>
  )
}
