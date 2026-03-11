export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 bg-accent rounded animate-pulse mb-6" />

      <div className="flex gap-8">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="h-4 w-16 bg-accent rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-accent rounded animate-pulse" />
              ))}
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-accent rounded animate-pulse" />
              ))}
            </div>
          </div>
        </aside>

        {/* Main content skeleton */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-7 w-48 bg-accent rounded animate-pulse mb-2" />
              <div className="h-4 w-24 bg-accent rounded animate-pulse" />
            </div>
            <div className="h-9 w-40 bg-accent rounded-lg animate-pulse" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="w-24 h-24 mx-auto bg-accent rounded-lg animate-pulse" />
                <div className="h-4 w-16 bg-accent rounded animate-pulse" />
                <div className="h-4 bg-accent rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-accent rounded animate-pulse" />
                <div className="h-6 w-24 bg-accent rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
