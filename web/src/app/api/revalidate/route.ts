import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const REVALIDATE_PATHS = [
  '/',
  '/ofertas',
  '/comparar',
  '/categorias',
  '/precios/resina-compuesta',
  '/precios/implantes-dentales',
  '/precios/limas-endodoncia',
]

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')

  const errors: { path: string; error: string }[] = []

  const paths = path ? [path] : REVALIDATE_PATHS

  for (const p of paths) {
    try {
      revalidatePath(p)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[revalidate] FAILED ${p}: ${msg}`)
      errors.push({ path: p, error: msg })
    }
  }

  if (errors.length > 0) {
    console.error(`[revalidate] ${errors.length}/${paths.length} paths failed`)
    return NextResponse.json(
      { revalidated: paths.filter((p) => !errors.find((e) => e.path === p)), errors },
      { status: 207 },
    )
  }

  console.log(`[revalidate] OK — ${paths.length} paths revalidated`)
  return NextResponse.json({ revalidated: paths })
}
