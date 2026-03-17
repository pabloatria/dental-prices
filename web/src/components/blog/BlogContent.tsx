import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'

interface BlogContentProps {
  source: string
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
      />
    </article>
  )
}
