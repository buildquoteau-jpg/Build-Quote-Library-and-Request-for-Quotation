import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// Hybrid publishing (Library V7): Data Studio calls this after writing a
// published_cards snapshot so the ISR library pages re-render immediately
// instead of waiting out the hourly TTL. Secured with a shared secret
// (REVALIDATE_SECRET, same value in the Data Studio Vercel project).
//
// Body: { mfrSlug, slug } for one card, or { all: true } for a bulk refresh.

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'Revalidation not configured.' }, { status: 503 })
  }
  if (request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 })
  }

  let body: { mfrSlug?: string; slug?: string; all?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const revalidated: string[] = []

  if (body.all) {
    revalidatePath('/library')
    revalidatePath('/library/[manufacturer]', 'page')
    revalidatePath('/library/[manufacturer]/[system]', 'page')
    revalidated.push('/library', '/library/* (all)')
  } else if (body.mfrSlug && body.slug) {
    revalidatePath('/library')
    revalidatePath(`/library/${body.mfrSlug}`)
    revalidatePath(`/library/${body.mfrSlug}/${body.slug}`)
    revalidated.push('/library', `/library/${body.mfrSlug}`, `/library/${body.mfrSlug}/${body.slug}`)
  } else {
    return NextResponse.json({ ok: false, error: 'Provide mfrSlug + slug, or all: true.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, revalidated })
}
