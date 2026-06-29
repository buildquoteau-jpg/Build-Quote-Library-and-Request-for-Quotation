import type { Metadata } from 'next'
import { getManufacturers, type ManufacturerListItem } from '@/lib/data/getSystems'

export const metadata: Metadata = {
  title: 'South West Building Materials Directory | BuildQuote',
  description:
    'Find building materials, product systems, manufacturers and local stockists across Dunsborough, Busselton, Margaret River, Bunbury and the South West of Western Australia.',
  openGraph: {
    title: 'South West Building Materials Directory | BuildQuote',
    description:
      'Find building materials, product systems, manufacturers and local stockists across the South West of Western Australia.',
    url: 'https://buildquote.com.au/south-west-building-materials-directory',
    siteName: 'BuildQuote',
    locale: 'en_AU',
    type: 'website',
  },
}

// Still used for links to the kept MFP supplier directory.
const MFP = 'https://search.buildquote.com.au'

// ── Static content ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Decking',        slug: 'decking' },
  { label: 'Cladding',       slug: 'cladding' },
  { label: 'Timber Framing', slug: 'timber-framing' },
  { label: 'Roofing',        slug: 'roofing' },
  { label: 'Insulation',     slug: 'insulation' },
  { label: 'Concrete',       slug: 'concrete' },
]

const TOWNS = [
  { name: 'Dunsborough',    description: 'Coastal building supplies and residential products for the Dunsborough area.' },
  { name: 'Busselton',      description: 'Find building material suppliers and manufacturers servicing Busselton and surrounds.' },
  { name: 'Margaret River', description: 'Product systems and suppliers for Margaret River residential and rural builds.' },
  { name: 'Bunbury',        description: 'South West hub — wide range of building product stockists across Bunbury.' },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Browse products & manufacturers',
    description: 'Explore building product systems from leading manufacturers — cladding, decking, roofing, framing and more.',
  },
  {
    step: '2',
    title: 'Build your quote request',
    description: 'Select profiles, components and colours. BuildQuote assembles a professional RFQ from your selections.',
  },
  {
    step: '3',
    title: 'Send to local suppliers',
    description: 'Your RFQ is sent to verified South West WA suppliers who can price and supply the products you need.',
  },
]

const FAQS = [
  {
    q: 'What areas does BuildQuote cover?',
    a: 'BuildQuote is focused on the South West of Western Australia, including Busselton, Dunsborough, Margaret River, Bunbury and surrounding areas.',
  },
  {
    q: 'Is it free to use the product directory?',
    a: 'Yes — browsing the South West Building Materials Directory is completely free for builders, renovators and owner-builders.',
  },
  {
    q: 'How do I get a quote from a local supplier?',
    a: "Browse a manufacturer's product systems, select what you need, and BuildQuote generates a professional RFQ sent to local South West WA suppliers who can price the job.",
  },
  {
    q: 'Can I save products for later?',
    a: 'Yes — create a free BuildQuote account to save product selections and return to your quote at any time.',
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SouthWestDirectoryPage() {
  const manufacturers = await getManufacturers()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'South West Building Materials Directory',
    description: 'Find building materials, product systems, manufacturers and local stockists across the South West of Western Australia.',
    url: 'https://buildquote.com.au/south-west-building-materials-directory',
    publisher: { '@type': 'Organization', name: 'BuildQuote', url: 'https://buildquote.com.au' },
    areaServed: { '@type': 'AdministrativeArea', name: 'South West Western Australia' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main style={{ fontFamily: 'var(--font-barlow), sans-serif', background: '#ffffff' }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section style={{
          background: 'linear-gradient(155deg, #0d3347 0%, #185D7A 55%, #1e7399 100%)',
          padding: '88px 24px 80px',
          textAlign: 'center',
        }}>
          {/* BuildQuote wordmark */}
          <div style={{ marginBottom: '28px' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
            }}>
              Build<span style={{ color: '#f97316' }}>Quote</span>
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(30px, 5.5vw, 56px)',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.08,
            marginBottom: '20px',
            fontFamily: 'var(--font-barlow-condensed), sans-serif',
          }}>
            South West Building<br />
            Materials Directory
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'rgba(255,255,255,0.78)',
            maxWidth: '600px',
            margin: '0 auto 44px',
            lineHeight: 1.65,
            fontWeight: 400,
          }}>
            Find building materials, product systems, manufacturers and local stockists across
            Dunsborough, Busselton, Margaret River, Bunbury and the South West of Western Australia.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/library"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f97316',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '16px',
                padding: '14px 32px',
                borderRadius: '10px',
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(249,115,22,0.35)',
                letterSpacing: '-0.01em',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="6" stroke="white" strokeWidth="2"/>
                <path d="M13.5 13.5L18 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Search building materials
            </a>
            <a
              href="#manufacturers"
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '15px',
                padding: '14px 28px',
                borderRadius: '10px',
                textDecoration: 'none',
              }}
            >
              Browse manufacturers
            </a>
          </div>
        </section>

        {/* ── Browse by category ─────────────────────────────────────────────── */}
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '72px 24px 0' }}>
          <SectionLabel>Browse by category</SectionLabel>
          <h2 style={sectionHeadingStyle}>Find products by type</h2>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '28px',
          }}>
            {CATEGORIES.map(cat => (
              <a
                key={cat.slug}
                href="/library"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  background: '#f5f7f9',
                  border: '1px solid #d1d9e0',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#185D7A',
                  letterSpacing: '-0.01em',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
              >
                {cat.label}
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ opacity: 0.5 }}>
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ))}
          </div>
        </section>

        {/* ── Browse manufacturers ───────────────────────────────────────────── */}
        <section id="manufacturers" style={{ maxWidth: '1100px', margin: '0 auto', padding: '72px 24px 0' }}>
          <SectionLabel>Browse manufacturers</SectionLabel>
          <h2 style={sectionHeadingStyle}>Building product manufacturers</h2>
          <p style={sectionSubStyle}>
            Explore product catalogues from manufacturers stocked by South West WA suppliers.
          </p>

          {manufacturers.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '20px',
              marginTop: '36px',
            }}>
              {manufacturers.map(m => <ManufacturerCard key={m.id} manufacturer={m} />)}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', marginTop: '28px', fontSize: '15px' }}>
              Loading manufacturers…
            </p>
          )}

          <div style={{ textAlign: 'center', marginTop: '44px' }}>
            <a href="/library" style={outlineBtnStyle}>
              View all manufacturers →
            </a>
          </div>
        </section>

        {/* ── Browse local suppliers ─────────────────────────────────────────── */}
        <section style={{ background: '#f5f7f9', margin: '72px 0 0', padding: '72px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <SectionLabel>Browse local suppliers</SectionLabel>
            <h2 style={sectionHeadingStyle}>South West WA supplier directory</h2>
            <p style={sectionSubStyle}>
              Find verified building material suppliers who stock and deliver across the South West.
              Compare product ranges, locations and request quotes directly.
            </p>
            <div style={{ marginTop: '32px' }}>
              <a href={`${MFP}/supplierdirectory`} style={orangeBtnStyle}>
                Browse local suppliers →
              </a>
            </div>
          </div>
        </section>

        {/* ── Browse by town ─────────────────────────────────────────────────── */}
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '72px 24px 0' }}>
          <SectionLabel>Browse by town</SectionLabel>
          <h2 style={sectionHeadingStyle}>Find suppliers near you</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
            marginTop: '32px',
          }}>
            {TOWNS.map(town => (
              <a
                key={town.name}
                href={`${MFP}/supplierdirectory`}
                style={{
                  display: 'block',
                  padding: '24px',
                  background: '#ffffff',
                  border: '1px solid #d1d9e0',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  borderLeft: '3px solid #185D7A',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#185D7A', marginBottom: '8px' }}>
                  {town.name}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                  {town.description}
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Featured product systems ───────────────────────────────────────── */}
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '72px 24px 0' }}>
          <SectionLabel>Featured product systems</SectionLabel>
          <h2 style={sectionHeadingStyle}>Popular building systems</h2>
          <p style={sectionSubStyle}>
            Browse the full catalogue of building product systems available through the South West directory.
          </p>
          <div style={{ marginTop: '32px' }}>
            <a href="/library" style={navyBtnStyle}>
              Browse product systems →
            </a>
          </div>
        </section>

        {/* ── How BuildQuote works ───────────────────────────────────────────── */}
        <section style={{ background: '#f5f7f9', margin: '72px 0 0', padding: '72px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <SectionLabel>How BuildQuote works</SectionLabel>
            <h2 style={sectionHeadingStyle}>From browse to quote in minutes</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
              marginTop: '40px',
            }}>
              {HOW_IT_WORKS.map(step => (
                <div key={step.step} style={{
                  background: '#ffffff',
                  border: '1px solid #d1d9e0',
                  borderRadius: '10px',
                  padding: '28px 24px',
                }}>
                  <div style={{
                    width: '34px', height: '34px',
                    background: '#f97316',
                    color: '#ffffff',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: 800,
                    marginBottom: '18px',
                    fontFamily: 'var(--font-barlow-condensed), sans-serif',
                  }}>
                    {step.step}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#185D7A', marginBottom: '8px', lineHeight: 1.3 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.65, margin: 0 }}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section style={{ maxWidth: '780px', margin: '0 auto', padding: '72px 24px' }}>
          <SectionLabel>FAQ</SectionLabel>
          <h2 style={sectionHeadingStyle}>Frequently asked questions</h2>
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{
                background: '#ffffff',
                border: '1px solid #d1d9e0',
                borderRadius: '10px',
                padding: '22px 24px',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#185D7A', marginBottom: '8px' }}>
                  {faq.q}
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.65, margin: 0 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA footer ────────────────────────────────────────────────────── */}
        <section style={{
          background: 'linear-gradient(155deg, #0d3347 0%, #185D7A 100%)',
          padding: '80px 24px',
          textAlign: 'center',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              Build<span style={{ color: '#f97316' }}>Quote</span>
            </span>
          </div>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 40px)',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '16px',
            fontFamily: 'var(--font-barlow-condensed), sans-serif',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}>
            Ready to find building products?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', marginBottom: '36px', lineHeight: 1.6 }}>
            Browse the South West Building Materials Directory — free for builders, renovators and owner-builders.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/library"
              style={{
                display: 'inline-block',
                background: '#f97316',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '16px',
                padding: '14px 36px',
                borderRadius: '10px',
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(249,115,22,0.35)',
              }}
            >
              Browse products & manufacturers
            </a>
            <a
              href="/rfq"
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.28)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '15px',
                padding: '14px 28px',
                borderRadius: '10px',
                textDecoration: 'none',
              }}
            >
              Start a quote request
            </a>
          </div>
        </section>

      </main>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#f97316',
      marginBottom: '8px',
    }}>
      {children}
    </div>
  )
}

function ManufacturerCard({ manufacturer }: { manufacturer: ManufacturerListItem }) {
  const posY = manufacturer.hero_image_position_y ?? 50
  return (
    <a
      href="/library"
      style={{
        display: 'block',
        background: '#ffffff',
        border: '1px solid #d1d9e0',
        borderRadius: '10px',
        overflow: 'hidden',
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          height: '160px',
          backgroundImage: manufacturer.hero_image_url
            ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.52)), url(${manufacturer.hero_image_url})`
            : 'linear-gradient(135deg, #0d3347 0%, #185D7A 100%)',
          backgroundSize: 'cover',
          backgroundPosition: `center ${posY}%`,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '14px 16px',
        }}
        role="img"
        aria-label={`${manufacturer.name} building products`}
      >
        <span style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#ffffff',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          lineHeight: 1.2,
          fontFamily: 'var(--font-barlow-condensed), sans-serif',
          letterSpacing: '-0.01em',
        }}>
          {manufacturer.name}
        </span>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        {manufacturer.description && (
          <p style={{
            fontSize: '13px',
            color: '#64748b',
            lineHeight: 1.55,
            margin: '0 0 10px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}>
            {manufacturer.description}
          </p>
        )}
        <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>
          {manufacturer.system_count} product system{manufacturer.system_count !== 1 ? 's' : ''} →
        </span>
      </div>
    </a>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 'clamp(22px, 3vw, 32px)',
  fontWeight: 800,
  color: '#185D7A',
  fontFamily: 'var(--font-barlow-condensed), sans-serif',
  letterSpacing: '-0.01em',
  lineHeight: 1.15,
}

const sectionSubStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#64748b',
  lineHeight: 1.65,
  maxWidth: '560px',
  marginTop: '10px',
}

const orangeBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#f97316',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '15px',
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  boxShadow: '0 4px 14px rgba(249,115,22,0.28)',
}

const navyBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#185D7A',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '15px',
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
}

const outlineBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  border: '2px solid #185D7A',
  color: '#185D7A',
  fontWeight: 700,
  fontSize: '15px',
  padding: '11px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
}
