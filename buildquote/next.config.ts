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
      // Images: self + data URIs + Supabase storage + Google Maps tiles + Google favicons
      "img-src 'self' data: https://*.supabase.co https://*.supabase.in https://*.gstatic.com https://maps.googleapis.com https://www.google.com",
      // Connections: self + Supabase + Vercel analytics + Google Maps + Places API
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://va.vercel-scripts.com https://maps.googleapis.com https://maps.gstatic.com https://places.googleapis.com",
      // No plugins, no object embeds
      "object-src 'none'",
      // Restrict framing to same origin (belt-and-suspenders with X-Frame-Options)
      "frame-ancestors 'self'",
      // Upgrade insecure requests in production
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  async redirects() {
    return [
      {
        source: '/products',
        destination: 'https://mfp.buildquote.com.au/manufacturers',
        permanent: false,
      },
      {
        source: '/products/:path*',
        destination: 'https://mfp.buildquote.com.au/manufacturers',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
