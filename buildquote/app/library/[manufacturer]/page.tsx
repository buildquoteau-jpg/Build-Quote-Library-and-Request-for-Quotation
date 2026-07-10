import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getManufacturerBySlug, getSystemsForManufacturer } from '@/lib/data/getSystems'
import { getStaticSystemsForManufacturer } from '@/lib/data/staticSystemCards'
import { SystemCardTileUI } from '@/components/library/SystemCardTileUI'

export const dynamic = 'force-dynamic'

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ manufacturer: string }>
}): Promise<Metadata> {
  const { manufacturer } = await params
  const mfr = await getManufacturerBySlug(manufacturer)
  if (!mfr) return {}

  const title = mfr.seo_title ?? `${mfr.name} | Building Product Library | BuildQuote`
  const description =
    mfr.seo_description ??
    mfr.description?.slice(0, 155) ??
    `Browse ${mfr.name} product systems and find local South West WA suppliers on BuildQuote.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://buildquote.com.au/library/${manufacturer}`,
      siteName: 'BuildQuote',
      locale: 'en_AU',
      type: 'website',
      ...(mfr.hero_image_url && { images: [{ url: mfr.hero_image_url, alt: mfr.name }] }),
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ManufacturerPage({
  params,
}: {
  params: Promise<{ manufacturer: string }>
}) {
  const { manufacturer } = await params
  const mfr = await getManufacturerBySlug(manufacturer)
  if (!mfr) notFound()

  // Experimental: static Data Studio package cards run alongside the live
  // Supabase-backed systems for this manufacturer (see staticSystemCards.ts).
  // Where a static package has replaced a live DB system (same base slug),
  // hide the live original so the two don't show as duplicate tiles.
  const staticSystems = getStaticSystemsForManufacturer(manufacturer)
  const staticBaseSlugs = new Set(staticSystems.map(s => s.slug.replace(/-static$/, '')))
  const liveSystems = (await getSystemsForManufacturer(manufacturer)).filter(
    s => !staticBaseSlugs.has(s.slug)
  )
  const systems = [...liveSystems, ...staticSystems]

  const heroImg = mfr.hero_wide_image_url ?? mfr.hero_image_url
  const heroPosY = (mfr.hero_wide_image_url ? mfr.hero_wide_image_position_y : mfr.hero_image_position_y) ?? 50

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    name: mfr.name,
    description: mfr.description ?? undefined,
    ...(mfr.logo_url && { logo: mfr.logo_url }),
    ...(mfr.website_url && { url: mfr.website_url }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main style={{ fontFamily: 'var(--font-barlow), sans-serif', background: '#f5f7f9', minHeight: '100vh' }}>

        {/* Breadcrumb */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid #d1d9e0', padding: '12px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <a href="/" style={{ color: '#185D7A', textDecoration: 'none', fontWeight: 600 }}>BuildQuote</a>
            <span style={{ color: '#d1d9e0' }}>›</span>
            <a href="/library" style={{ color: '#185D7A', textDecoration: 'none', fontWeight: 600 }}>Library</a>
            <span style={{ color: '#d1d9e0' }}>›</span>
            <span style={{ color: '#64748b' }}>{mfr.name}</span>
          </div>
        </div>

        {/* Hero */}
        <section style={{
          position: 'relative',
          backgroundImage: heroImg
            ? `linear-gradient(100deg, rgba(11,44,60,0.92) 0%, rgba(14,55,74,0.66) 46%, rgba(20,86,110,0.24) 100%), url(${heroImg})`
            : 'linear-gradient(155deg, #0d3347 0%, #185D7A 55%, #1e7399 100%)',
          backgroundSize: 'cover',
          backgroundPosition: `center ${heroPosY}%`,
          padding: '60px 24px',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h1 style={{
              margin: 0, fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 800, color: '#fff',
              letterSpacing: '-0.02em', lineHeight: 1.05, fontFamily: 'var(--font-barlow-condensed), sans-serif',
            }}>
              {mfr.name}
            </h1>
            {mfr.description && (
              <p style={{ margin: 0, maxWidth: '680px', fontSize: 'clamp(14px, 1.8vw, 16px)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
                {mfr.description}
              </p>
            )}
            {mfr.website_url && (
              <a href={mfr.website_url} target="_blank" rel="noopener noreferrer" style={{
                alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 700, fontSize: '15px',
                padding: '11px 24px', borderRadius: '10px', textDecoration: 'none',
                border: '1.5px solid rgba(255,255,255,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                marginTop: '4px',
              }}>
                Visit {mfr.name} website
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>
              </a>
            )}
          </div>
        </section>

        {/* Systems grid */}
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 24px 80px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '18px' }}>
            {systems.length} product system{systems.length !== 1 ? 's' : ''}
          </div>
          {systems.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
              {systems.map(s => <SystemCardTileUI key={s.id} system={s} />)}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '15px' }}>No product systems listed yet.</p>
          )}

          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <a href="/library" style={{
              fontSize: '13px', fontWeight: 600, color: '#185D7A', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 12L4 7L9 2" stroke="#185D7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              All manufacturers
            </a>
          </div>
        </section>

      </main>
    </>
  )
}
