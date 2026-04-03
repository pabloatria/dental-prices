import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const REVALIDATE_PATHS = [
  '/',
  '/ofertas',
  '/comparar',
]

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')

  if (path) {
    revalidatePath(path)
    return NextResponse.json({ revalidated: [path] })
  }

  for (const p of REVALIDATE_PATHS) {
    revalidatePath(p)
  }

  return NextResponse.json({ revalidated: REVALIDATE_PATHS })
}
