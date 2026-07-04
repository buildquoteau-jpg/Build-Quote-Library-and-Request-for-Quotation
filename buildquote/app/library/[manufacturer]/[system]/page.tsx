import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSystemByManufacturerAndSlug, getStockistsForSystem } from '@/lib/data/getSystems'
import { SystemCardWrapper } from '@/app/library/[manufacturer]/[system]/SystemCardWrapper'

export const dynamic = 'force-dynamic'

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ manufacturer: string; system: string }>
}): Promise<Metadata> {
  const { manufacturer, system: systemSlug } = await params
  const system = await getSystemByManufacturerAndSlug(manufacturer, systemSlug)
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
      url: `https://buildquote.com.au/library/${manufacturer}/${systemSlug}`,
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
  params: Promise<{ manufacturer: string; system: string }>
}) {
  const { manufacturer, system: systemSlug } = await params
  const system = await getSystemByManufacturerAndSlug(manufacturer, systemSlug)
  if (!system) notFound()

  const stockists = await getStockistsForSystem(system.id)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: system.name,
    description: system.description ?? undefined,
    brand: system.manufacturer
      ? { '@type': 'Brand', name: system.manufacturer.name }
      : undefined,
    category: system.category ?? undefined,
    url: `https://buildquote.com.au/library/${manufacturer}/${systemSlug}`,
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

        {/* Sticky branded nav — back to manufacturer + wordmark, always reachable */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'saturate(180%) blur(8px)', WebkitBackdropFilter: 'saturate(180%) blur(8px)', borderBottom: '1px solid #d1d9e0', boxShadow: '0 1px 8px rgba(15,30,45,0.05)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <a href={`/library/${manufacturer}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#185D7A', textDecoration: 'none', fontWeight: 700, fontSize: '14px', minWidth: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M10 3.5L5.5 8L10 12.5" stroke="#185D7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{system.manufacturer?.name ?? 'Library'}</span>
            </a>
            <a href="/library" style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em', color: '#185D7A', textDecoration: 'none', flexShrink: 0 }}>
              Build<span style={{ color: '#f97316' }}>Quote</span>
            </a>
          </div>
        </div>

        {/* Card */}
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 80px' }}>
          <SystemCardWrapper
            system={system}
            stockists={stockists}
            cardUrl={`https://buildquote.com.au/library/${manufacturer}/${systemSlug}`}
          />

          {/* Back link */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <a href={`/library/${manufacturer}`} style={{
              fontSize: '13px', fontWeight: 600, color: '#185D7A',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 12L4 7L9 2" stroke="#185D7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to {system.manufacturer?.name ?? 'library'}
            </a>
          </div>
        </div>

      </main>
    </>
  )
}
