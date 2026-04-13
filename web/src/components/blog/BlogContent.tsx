import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'
import type { MDXComponents } from 'mdx/types'

interface BlogContentProps {
  source: string
}

const mdxComponents: MDXComponents = {
  img: (props) => {
    const { src: rawSrc, alt, ...rest } = props as React.ImgHTMLAttributes<HTMLImageElement>
    const src = typeof rawSrc === 'string' ? rawSrc : ''
    if (!src) return null

    // External images: use regular img tag
    if (src.startsWith('http')) {
      return (
        <figure className="my-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ''}
            className="rounded-lg w-full"
            loading="lazy"
            {...rest}
          />
          {alt && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {alt}
            </figcaption>
          )}
        </figure>
      )
    }

    // Local images: use Next.js Image with optimization
    return (
      <figure className="my-8">
        <Image
          src={src}
          alt={alt || ''}
          width={1200}
          height={675}
          className="rounded-lg w-full h-auto"
          sizes="(max-width: 768px) 100vw, 768px"
        />
        {alt && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {alt}
          </figcaption>
        )}
      </figure>
    )
  },
}

export default function BlogContent({ source }: BlogContentProps) {
  return (
    <article className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground prose-td:text-muted-foreground prose-th:text-foreground prose-blockquote:text-muted-foreground prose-blockquote:border-primary/30">
      <MDXRemote
        source={source}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
        components={mdxComponents}
      />
    </article>
  )
}
