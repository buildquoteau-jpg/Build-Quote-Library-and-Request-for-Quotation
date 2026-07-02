import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessCookie } from '@/app/api/access/route'

// Routes that are always public — no demo password required
const PUBLIC_PATHS = ['/', '/coming-soon', '/privacy', '/terms', '/access', '/flyer', '/explainer']

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    /\.(png|ico|svg|jpg|jpeg|webp|woff2?)$/.test(pathname)
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Demo password gate ────────────────────────────────────────────────────
  // When DEMO_PASSWORD is set in env, all non-public routes require the cookie.
  const demoPassword = process.env.DEMO_PASSWORD
  if (demoPassword && !isPublicPath(pathname)) {
    const accessCookie = request.cookies.get('bq_access')?.value
    if (!verifyAccessCookie(accessCookie, demoPassword)) {
      const accessUrl = request.nextUrl.clone()
      accessUrl.pathname = '/access'
      // Preserve full path + query string so draft/supplier params survive the redirect
      accessUrl.searchParams.set('next', pathname + request.nextUrl.search)
      return NextResponse.redirect(accessUrl)
    }
  }

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

  // Protect /dashboard and /rfq — redirect unauthenticated users to /login.
  // The library and shopping list stay public; only the quote-request flow
  // requires a builder login. Preserve the full path + query so draft/supplier
  // params survive the round-trip through login.
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/rfq')) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = '' // drop the original query; carry it only inside `next`
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect logged-in users away from /login and /register
  if ((pathname === '/login' || pathname === '/register') && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}

export const config = {
  // Match all routes except static assets
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.png$|.*\\.ico$).*)'],
}
