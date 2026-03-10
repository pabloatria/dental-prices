const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

export async function searchProducts(query: string, page = 1) {
  const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}&page=${page}`)
  return res.json()
}

export async function getProduct(id: string) {
  const res = await fetch(`${API_URL}/api/search?q=&page=1`)
  // For now, search all and find by ID. Will add dedicated endpoint later.
  const data = await res.json()
  return data.products?.find((p: any) => p.id === id) || null
}
