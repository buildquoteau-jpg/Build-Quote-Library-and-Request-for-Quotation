import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSystemByManufacturerAndSlug, getStockistsForSystem } from '@/lib/data/getSystems'
import { getStaticSystemByManufacturerAndSlug, getStaticStockists } from '@/lib/data/staticSystemCards'
import { getPublishedCard, getPublishedStockists } from '@/lib/data/publishedCards'
import { SystemCardWrapper } from '@/app/library/[manufacturer]/[system]/SystemCardWrapper'

// ISR: pages are cached and re-rendered on demand — Data Studio pings
// /api/revalidate-card on every publish, with the hourly TTL as backstop.
export const revalidate = 3600

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ manufacturer: string; system: string }>
}): Promise<Metadata> {
  const { manufacturer, system: systemSlug } = await params
  const published = await getPublishedCard(manufacturer, systemSlug)
  const system = published?.system
    ?? (await getSystemByManufacturerAndSlug(manufacturer, systemSlug))
    ?? getStaticSystemByManufacturerAndSlug(manufacturer, systemSlug)
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

  // Absolute, valid image — the crawler-safe jpg cover for hybrid-published
  // cards, else the hero image, else a generated BuildQuote-branded fallback
  // (guaranteed correct 1200×630, never a broken/relative URL).
  const heroUrl = (published?.ogImageUrl ?? system.hero_image_url)?.trim()
  const hasValidHero = !!heroUrl && /^https?:\/\//i.test(heroUrl)
  const imageUrl = hasValidHero
    ? heroUrl!
    : `https://buildquote.com.au/api/og-fallback?title=${encodeURIComponent(system.name)}${mfrName ? `&manufacturer=${encodeURIComponent(mfrName)}` : ''}`

  return {
    title: `${system.name} — System Card`,
    description,
    // AI knowledge layer (design doc §11/§14 step 12) — a machine-readable
    // sibling of this page, mirrored from Data Studio. Purely additive: no
    // visual change, nothing else on this page reads or renders it.
    alternates: {
      canonical: canonicalUrl,
      types: { 'application/ld+json': `https://buildquote.com.au/api/library/${manufacturer}/${systemSlug}/knowledge.jsonld` },
    },
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

  // Resolution order: hybrid-published snapshot → legacy systems row →
  // installed static package. Snapshot wins so a re-publish instantly
  // supersedes older copies of the same card.
  const published = await getPublishedCard(manufacturer, systemSlug)
  const liveSystem = published ? null : await getSystemByManufacturerAndSlug(manufacturer, systemSlug)
  const system = published?.system ?? liveSystem ?? getStaticSystemByManufacturerAndSlug(manufacturer, systemSlug)
  if (!system) notFound()

  // Stockists stay live from the DB (per-revalidation): published cards use
  // the production join when linked (production_system_id), falling back to
  // the stockist copy embedded in the snapshot; static package cards read
  // their own bundled list from card.json.
  const stockists = published
    ? (published.productionSystemId
        ? await getStockistsForSystem(published.productionSystemId)
        : await getPublishedStockists(manufacturer, systemSlug))
    : liveSystem
      ? await getStockistsForSystem(liveSystem.id)
      : getStaticStockists(manufacturer, systemSlug)

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

      <main style={{ fontFamily: 'var(--font-barlow), sans-serif', minHeight: '100vh' }}>

        {/* Sticky branded nav — back to manufacturer + wordmark, always reachable.
            System Card V2 supplies its own full-bleed dark backdrop below this,
            so the light 720px page shell the old card sat in was dropped here —
            the "Back to X" link it carried is redundant with this nav bar. */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'saturate(180%) blur(8px)', WebkitBackdropFilter: 'saturate(180%) blur(8px)', borderBottom: '1px solid #d1d9e0', boxShadow: '0 1px 8px rgba(15,30,45,0.05)' }}>
          {/* Right padding cleared to 72px (not the usual 20px) — GlobalNav's
              hamburger is a fixed 42px button sitting at top:16px/right:16px
              with a higher z-index, so it was overlapping/hiding the tail end
              of the BuildQuote wordmark without the extra clearance. */}
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '9px 72px 9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <a href={`/library/${manufacturer}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#185D7A', textDecoration: 'none', fontWeight: 700, fontSize: '14px', minWidth: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M10 3.5L5.5 8L10 12.5" stroke="#185D7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{system.manufacturer?.name ?? 'Library'}</span>
            </a>
            <a href="/library" style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em', color: '#185D7A', textDecoration: 'none', flexShrink: 0 }}>
              Build<span style={{ color: '#f97316' }}>Quote</span>
            </a>
          </div>
        </div>

        <SystemCardWrapper
          system={system}
          stockists={stockists}
          cardUrl={`https://buildquote.com.au/library/${manufacturer}/${systemSlug}`}
        />

      </main>
    </>
  )
}
