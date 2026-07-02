import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HSTS — only sent over HTTPS; Vercel handles TLS termination
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Basic CSP: allow same-origin + Supabase + Resend + Google Fonts + Vercel Analytics.
  // Tighten further once the full list of external origins is confirmed.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: self + Next.js inline scripts (nonce not yet wired) + Vercel analytics + Google Maps
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://maps.googleapis.com",
      // Styles: self + Google Fonts + inline (Tailwind injects inline styles)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs + any HTTPS host. The library aggregates
      // manufacturer imagery from many external CDNs (Supabase, Wix, etc.);
      // images can't execute code, so a broad img-src is low risk.
      "img-src 'self' data: https:",
      // Connections: self + Supabase + Vercel analytics + Google Maps + Places API
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://va.vercel-scripts.com https://maps.googleapis.com https://maps.gstatic.com https://places.googleapis.com",
      // Frames: self + Google Maps embed (stockist location maps on /library)
      "frame-src 'self' https://www.google.com",
      // No plugins, no object embeds
      "object-src 'none'",
      // Restrict framing to same origin (belt-and-suspenders with X-Frame-Options)
      "frame-ancestors 'self'",
      // Upgrade insecure requests in production only — on http://localhost it
      // rewrites same-origin subresources to https://localhost, which breaks
      // local images/scripts (nothing listens on https in dev)
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  images: {
    // The library aggregates manufacturer imagery from many external CDNs
    // (Supabase, Wix, manufacturer sites…). Allow any HTTPS host so new
    // manufacturers work without a config change. Image bytes can't execute
    // code, and the CSP already permits `img-src 'self' data: https:`.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    // Serve modern formats — AVIF first, WebP fallback.
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  async rewrites() {
    return [
      {
        // Clean URL for the static explainer video page (public/explainer/index.html)
        source: '/explainer',
        destination: '/explainer/index.html',
      },
    ]
  },

  async redirects() {
    return [
      {
        source: '/products',
        destination: '/library',
        permanent: false,
      },
      {
        source: '/products/:path*',
        destination: '/library',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
