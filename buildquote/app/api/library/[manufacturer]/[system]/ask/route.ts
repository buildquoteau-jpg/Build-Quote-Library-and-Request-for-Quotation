import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

// v6 side of the AI Knowledge Gap & Feedback Loop (design doc addendum
// "AI Knowledge Gap & Feedback Loop", §A5). Thin proxy to Data Studio's
// /api/knowledge/ask — same mirror pattern as this system's knowledge.jsonld
// route (Studio stays canonical, this repo never generates an answer or
// logs a gap itself), just POST instead of GET.
//
// The only new piece of session state v6 gains: an httpOnly `bq_anon`
// cookie, issued on first use, so a knowledge gap can be attributed to a
// session without requiring the builder to be logged in (/library has no
// auth — see CLAUDE.md "Auth model"). It carries no identity, just an
// opaque id for de-duplication and audit on the Studio side.

const STUDIO_ORIGIN = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.buildquote.com.au').replace(/\/$/, '')
const ANON_COOKIE = 'bq_anon'
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ manufacturer: string; system: string }> },
) {
  const { manufacturer, system } = await params
  const body = await req.json().catch(() => null) as { question?: string } | null
  const question = body?.question?.trim()

  if (!question) {
    return NextResponse.json({ error: 'question is required.' }, { status: 400 })
  }

  const existingAnonId = req.cookies.get(ANON_COOKIE)?.value
  const anonSessionId = existingAnonId || randomUUID()

  let payload: unknown
  let status = 200
  try {
    const upstream = await fetch(`${STUDIO_ORIGIN}/api/knowledge/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manufacturerSlug: manufacturer, systemSlug: system, question, anonSessionId }),
    })
    status = upstream.status
    payload = await upstream.json().catch(() => ({ error: 'Studio returned an unreadable response.' }))
  } catch {
    // Studio unreachable — the builder still gets a safe, honest response
    // rather than a broken request. Nothing is invented locally: no
    // fabricated answer, no attempt to guess at product facts here.
    status = 200
    payload = {
      status: 'NO_VERIFIED_ANSWER',
      answer: null,
      message: 'I can’t check that right now — please try again in a moment.',
      recovery: { rewordHint: true, systemCardUrl: `/library/${manufacturer}/${system}` },
      gapId: null,
      gapLoggedMessage: null,
    }
  }

  const res = NextResponse.json(payload, { status })
  if (!existingAnonId) {
    res.cookies.set(ANON_COOKIE, anonSessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: ANON_COOKIE_MAX_AGE,
      path: '/',
    })
  }
  return res
}
