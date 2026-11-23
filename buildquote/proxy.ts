import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Supabase auth ─────────────────────────────────────────────────────────
  // Skip auth entirely when Supabase credentials aren't configured (local dev without .env.local)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Zero-friction entry: /dashboard, /rfq, and /library are open without login.
  // Guest builders can explore the Builder Portal, manage local jobs/suppliers,
  // build RFQs, and are offered an optional sign-in / free account before sending.

  // Redirect logged-in users away from /login and /register
  if ((pathname === '/login' || pathname === '/register') && user) {
    const next = request.nextUrl.searchParams.get('next')
    const redirectUrl = request.nextUrl.clone()
    if (next && next.startsWith('/')) {
      const parsed = new URL(next, request.nextUrl.origin)
      redirectUrl.pathname = parsed.pathname
      redirectUrl.search = parsed.search
    } else {
      redirectUrl.pathname = '/dashboard'
      redirectUrl.search = ''
    }
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  // Match all routes except static assets
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.png$|.*\\.ico$).*)'],
}
