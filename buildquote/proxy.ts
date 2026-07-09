import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessCookie } from '@/app/api/access/route'

// Routes that are always public — no demo password required
const PUBLIC_PATHS = ['/', '/coming-soon', '/privacy', '/terms', '/access', '/flyer', '/explainer', '/mywork']

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    // Includes the file types used by static assets under /public (e.g. the
    // manufacturer static System Card packages under /manufacturers/*/systems/):
    // stylesheets, scripts, data files and downloadable guides all need to be
    // reachable without the demo cookie, same as images already are below.
    /\.(png|ico|svg|jpg|jpeg|webp|woff2?|css|js|json|pdf|md|csv)$/.test(pathname)
  )
}

// Link-preview crawlers (carry no login/demo cookie) that need to reach real
// /library/* content to generate rich WhatsApp/iMessage/Slack/LinkedIn/etc.
// previews. Scoped to /library only — every other gated route (dashboard,
// rfq, ...) is unaffected, and a human clicking the same link still hits
// /access as normal. Not spoof-proof (User-Agent is client-supplied), but the
// demo gate's threat model is "keep the pre-launch site out of search/casual
// discovery," not access control on sensitive data, so that trade-off is fine.
const CRAWLER_USER_AGENT_PATTERNS = [
  /whatsapp/i,
  /facebookexternalhit/i,
  /facebot/i,
  /slackbot/i,
  /linkedinbot/i,
  /twitterbot/i,
  /discordbot/i,
  /telegrambot/i,
  /pinterest/i,
  /skypeuripreview/i,
  /vkshare/i,
]

function isLinkPreviewCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return CRAWLER_USER_AGENT_PATTERNS.some((re) => re.test(userAgent))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Demo password gate ────────────────────────────────────────────────────
  // When DEMO_PASSWORD is set in env, all non-public routes require the cookie.
  const demoPassword = process.env.DEMO_PASSWORD
  const bypassForCrawler =
    pathname.startsWith('/library') && isLinkPreviewCrawler(request.headers.get('user-agent'))
  if (demoPassword && !isPublicPath(pathname) && !bypassForCrawler) {
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
