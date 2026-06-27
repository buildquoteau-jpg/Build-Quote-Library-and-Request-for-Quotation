import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSystemBySlug } from '@/lib/data/getSystems'
import { SystemCardUI } from '@/components/library/SystemCardUI'

export const dynamic = 'force-dynamic'

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const system = await getSystemBySlug(slug)
  if (!system) return {}

  const title = `${system.name} | ${system.manufacturer?.name ?? 'BuildQuote'} | Building Product Library`
  const description =
    system.description?.slice(0, 155) ??
    `${system.name} by ${system.manufacturer?.name ?? 'BuildQuote'}. Browse profiles, components and colours. Request a quote from local South West WA suppliers.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://buildquote.com.au/library/${slug}`,
      siteName: 'BuildQuote',
      locale: 'en_AU',
      type: 'website',
      ...(system.hero_image_url && {
        images: [{ url: system.hero_image_url, alt: system.name }],
      }),
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SystemPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const system = await getSystemBySlug(slug)
  if (!system) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: system.name,
    description: system.description ?? undefined,
    brand: system.manufacturer
      ? { '@type': 'Brand', name: system.manufacturer.name }
      : undefined,
    category: system.category ?? undefined,
    url: `https://buildquote.com.au/library/${slug}`,
    ...(system.hero_image_url && { image: system.hero_image_url }),
    ...(system.australian_made && { countryOfOrigin: 'AU' }),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'AUD',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'BuildQuote', url: 'https://buildquote.com.au' },
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main style={{ fontFamily: 'var(--font-barlow), sans-serif', background: '#f5f7f9', minHeight: '100vh' }}>

        {/* Breadcrumb */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid #d1d9e0', padding: '12px 24px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <a href="/" style={{ color: '#185D7A', textDecoration: 'none', fontWeight: 600 }}>BuildQuote</a>
            <span style={{ color: '#d1d9e0' }}>›</span>
            <a href="/library" style={{ color: '#185D7A', textDecoration: 'none', fontWeight: 600 }}>Library</a>
            <span style={{ color: '#d1d9e0' }}>›</span>
            <span style={{ color: '#64748b' }}>{system.name}</span>
          </div>
        </div>

        {/* Card */}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 80px' }}>
          <SystemCardUI system={system} />

          {/* Back link */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <a href="/library" style={{
              fontSize: '13px', fontWeight: 600, color: '#185D7A',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 12L4 7L9 2" stroke="#185D7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to library
            </a>
          </div>
        </div>

      </main>
    </>
  )
}
