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

  const canonicalUrl = `https://buildquote.com.au/library/${manufacturer}/${systemSlug}`
  const mfrName = system.manufacturer?.name ?? null
  const profileCount = system.system_profiles?.length ?? 0
  const componentCount = system.system_components?.length ?? 0

  // Rich share title for chat-app link unfurls (WhatsApp/iMessage/Slack/
  // LinkedIn): "{name} · {manufacturer} · N profiles · M components". Each
  // segment is omitted cleanly when missing/zero — never "0 profiles".
  const ogTitle = [
    system.name,
    mfrName,
    profileCount > 0 ? `${profileCount} profile${profileCount === 1 ? '' : 's'}` : null,
    componentCount > 0 ? `${componentCount} component${componentCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ')

  // Description: manufacturer-authored copy when present, else a category-based
  // default. Cut at a word boundary for a clean social-preview length.
  const category = system.category?.trim()
  const rawDescription = system.description?.trim() || (
    category
      ? `${category} System Card with product specifications, compatible components and installation resources.`
      : 'System Card with product specifications, compatible components and installation resources.'
  )
  const description = rawDescription.length > 160
    ? `${rawDescription.slice(0, 160).replace(/\s+\S*$/, '')}…`
    : rawDescription

  // Absolute, valid image — the published hero image when present, else a
  // generated BuildQuote-branded fallback (guaranteed correct 1200×630, never
  // a broken/relative URL).
  const heroUrl = system.hero_image_url?.trim()
  const hasValidHero = !!heroUrl && /^https?:\/\//i.test(heroUrl)
  const imageUrl = hasValidHero
    ? heroUrl!
    : `https://buildquote.com.au/api/og-fallback?title=${encodeURIComponent(system.name)}${mfrName ? `&manufacturer=${encodeURIComponent(mfrName)}` : ''}`

  return {
    title: `${system.name} — System Card`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      siteName: 'BuildQuote',
      locale: 'en_AU',
      url: canonicalUrl,
      title: ogTitle,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: system.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [imageUrl],
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
