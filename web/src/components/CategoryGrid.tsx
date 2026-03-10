import Link from 'next/link'

const categories = [
  { name: 'Resinas', slug: 'resinas', icon: '🦷' },
  { name: 'Instrumental', slug: 'instrumental', icon: '🔧' },
  { name: 'Endodoncia', slug: 'endodoncia', icon: '📌' },
  { name: 'Ortodoncia', slug: 'ortodoncia', icon: '😁' },
  { name: 'Cirugia', slug: 'cirugia', icon: '✂️' },
  { name: 'Anestesia', slug: 'anestesia', icon: '💉' },
  { name: 'Bioseguridad', slug: 'bioseguridad', icon: '🧤' },
  { name: 'Equipamiento', slug: 'equipamiento', icon: '🏥' },
]

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/categorias/${cat.slug}`}
          className="flex flex-col items-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition"
        >
          <span className="text-3xl mb-2">{cat.icon}</span>
          <span className="text-sm font-medium text-gray-700">{cat.name}</span>
        </Link>
      ))}
    </div>
  )
}
