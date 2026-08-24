import { NextRequest, NextResponse } from 'next/server'

// v6 mirror of Data Studio's AI knowledge-layer endpoint (design doc
// "AI Knowledge Layer + Data Studio Workspace Redesign" §11/§14 step 12).
//
// Studio stays canonical — every object it returns carries its own
// bq:canonicalUrl pointing back at studio.buildquote.com.au, so this route
// is a cache with a pointer, never a second source of truth. It exists so
// an agent hitting the consumer domain (buildquote.com.au) gets a
// first-party answer instead of a cross-domain redirect.
//
//   GET /api/library/<manufacturer>/<system>/knowledge.jsonld[?v=<version>]
//
// ISR-cached for 5 minutes via Next's fetch cache; falls back to a 302
// straight to Studio if the upstream fetch fails for any reason (Studio
// down, card not found there either, network error) — the object is never
// invented locally.

const STUDIO_ORIGIN = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.buildquote.com.au').replace(/\/$/, '')

export const revalidate = 300

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ manufacturer: string; system: string }> },
) {
  const { manufacturer, system } = await params
  const version = req.nextUrl.searchParams.get('v')

  const studioUrl = `${STUDIO_ORIGIN}/api/cards/${encodeURIComponent(system)}/knowledge.jsonld` +
    `?m=${encodeURIComponent(manufacturer)}${version ? `&v=${encodeURIComponent(version)}` : ''}`

  try {
    const upstream = await fetch(studioUrl, { next: { revalidate: 300 } })
    if (!upstream.ok) {
      // Card not found there either, or Studio is erroring — send the
      // caller straight to the source rather than fabricating a response.
      return NextResponse.redirect(studioUrl, 302)
    }
    const body = await upstream.text()
    return new NextResponse(body, {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/ld+json' },
    })
  } catch {
    return NextResponse.redirect(studioUrl, 302)
  }
}
