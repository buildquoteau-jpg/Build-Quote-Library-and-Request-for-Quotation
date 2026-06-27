import type { Metadata } from 'next'
import { getAllSystems, type LibrarySystem } from '@/lib/data/getSystems'
import { SystemCardTileUI } from '@/components/library/SystemCardTileUI'

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LibraryPage() {
  const systems = await getAllSystems()

  // Group by category, preserving sort order within each group
  const grouped = systems.reduce<Record<string, LibrarySystem[]>>((acc, sys) => {
    const cat = sys.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(sys)
    return acc
  }, {})

  const categories = Object.keys(grouped).sort()

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

        {/* ── Category nav ──────────────────────────────────────────────────── */}
        {categories.length > 1 && (
          <div style={{ background: '#ffffff', borderBottom: '1px solid #d1d9e0', overflowX: 'auto' }}>
            <div style={{
              maxWidth: '1100px', margin: '0 auto', padding: '0 24px',
              display: 'flex', gap: '0', whiteSpace: 'nowrap' as const,
            }}>
              {categories.map(cat => (
                <a
                  key={cat}
                  href={`#${slugifyCategory(cat)}`}
                  style={{
                    display: 'inline-block',
                    padding: '14px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#185D7A',
                    textDecoration: 'none',
                    borderBottom: '2px solid transparent',
                    transition: 'border-color 0.12s',
                  }}
                >
                  {cat}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Systems by category ───────────────────────────────────────────── */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px 80px' }}>
          {systems.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '15px', textAlign: 'center', padding: '60px 0' }}>
              No products in the library yet.
            </p>
          ) : (
            categories.map(cat => (
              <section key={cat} id={slugifyCategory(cat)} style={{ marginBottom: '56px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316', marginBottom: '4px' }}>
                    Product category
                  </div>
                  <h2 style={{
                    fontSize: 'clamp(20px, 2.5vw, 28px)',
                    fontWeight: 800,
                    color: '#185D7A',
                    fontFamily: 'var(--font-barlow-condensed), sans-serif',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.15,
                  }}>
                    {cat}
                  </h2>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                }}>
                  {grouped[cat].map(sys => (
                    <SystemCardTileUI key={sys.id} system={sys} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

      </main>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugifyCategory(cat: string): string {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
