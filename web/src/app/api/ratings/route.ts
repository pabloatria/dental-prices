import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('product_id')
  if (!productId) {
    return Response.json({ error: 'product_id required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get aggregate rating
  const { data: ratings } = await supabase
    .from('product_ratings')
    .select('rating')
    .eq('product_id', productId)

  if (!ratings || ratings.length === 0) {
    return Response.json({ average: 0, count: 0, userRating: null })
  }

  const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
  const average = Math.round((sum / ratings.length) * 10) / 10

  // Get current user's rating if logged in
  const { data: { user } } = await supabase.auth.getUser()
  let userRating = null
  if (user) {
    const { data } = await supabase
      .from('product_ratings')
      .select('rating')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .single()
    userRating = data?.rating || null
  }

  return Response.json({ average, count: ratings.length, userRating })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Login required' }, { status: 401 })
  }

  const { product_id, rating } = await request.json()

  if (!product_id || !rating || rating < 1 || rating > 5) {
    return Response.json({ error: 'Valid product_id and rating (1-5) required' }, { status: 400 })
  }

  // Upsert: insert or update existing rating
  const { error } = await supabase
    .from('product_ratings')
    .upsert(
      {
        user_id: user.id,
        product_id,
        rating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,product_id' }
    )

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
