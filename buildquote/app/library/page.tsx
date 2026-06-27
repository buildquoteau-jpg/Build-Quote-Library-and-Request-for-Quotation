import type { Metadata } from 'next'
import { getAllSystems } from '@/lib/data/getSystems'
import { LibraryIndexClient } from '@/components/library/LibraryIndexClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Building Product Library | BuildQuote',
  description:
    'Browse building product systems from leading manufacturers — cladding, decking, roofing, interior linings and more. Add to your list and request a quote from local South West WA suppliers.',
  openGraph: {
    title: 'Building Product Library | BuildQuote',
    description:
      'Browse building product systems from leading manufacturers. Add to your list and request a quote from local South West WA suppliers.',
    url: 'https://buildquote.com.au/library',
    siteName: 'BuildQuote',
    locale: 'en_AU',
    type: 'website',
  },
}

export default async function LibraryPage() {
  const systems = await getAllSystems()

  const categories = Array.from(
    new Set(systems.map(s => s.category || 'Other'))
  ).sort()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Building Product Library',
    description: 'Browse building product systems from leading manufacturers available through BuildQuote.',
    url: 'https://buildquote.com.au/library',
    publisher: { '@type': 'Organization', name: 'BuildQuote', url: 'https://buildquote.com.au' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main style={{ fontFamily: 'var(--font-barlow), sans-serif', background: '#f5f7f9', minHeight: '100vh' }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section style={{
          background: 'linear-gradient(155deg, #0d3347 0%, #185D7A 55%, #1e7399 100%)',
          padding: '72px 24px 64px',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                Build<span style={{ color: '#f97316' }}>Quote</span> — Product Library
              </span>
            </div>
            <h1 style={{
              fontSize: 'clamp(26px, 4.5vw, 48px)',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: '14px',
              fontFamily: 'var(--font-barlow-condensed), sans-serif',
            }}>
              Building Product Library
            </h1>
            <p style={{
              fontSize: 'clamp(14px, 1.8vw, 17px)',
              color: 'rgba(255,255,255,0.75)',
              maxWidth: '520px',
              lineHeight: 1.65,
              marginBottom: '32px',
            }}>
              Browse product systems, add to your list and convert to an RFQ — sent directly to local South West WA suppliers.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a href="/rfq" style={{
                display: 'inline-block',
                background: '#f97316',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '15px',
                padding: '11px 26px',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
              }}>
                Start a quote request
              </a>
              <a href="/dashboard" style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.28)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                padding: '11px 22px',
                borderRadius: '8px',
                textDecoration: 'none',
              }}>
                Builder portal
              </a>
            </div>
          </div>
        </section>

        {/* ── Search, filter + grid (client) ────────────────────────────────── */}
        {systems.length === 0 ? (
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '15px' }}>No products in the library yet.</p>
          </div>
        ) : (
          <LibraryIndexClient initialSystems={systems} categories={categories} />
        )}

      </main>
    </>
  )
}
