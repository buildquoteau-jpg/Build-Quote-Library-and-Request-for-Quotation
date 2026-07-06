import type { Metadata } from 'next'

// /mywork — public work-in-progress page (no demo password; listed in
// proxy.ts PUBLIC_PATHS). The narrative behind BuildQuote plus an About
// section — shareable with anyone without handing out the gate password.

export const metadata: Metadata = {
  title: 'Work in progress — BuildQuote',
  description:
    'A portable bridge between discovery and purchase. The thinking behind BuildQuote Library, Trade Desk Search and builder/trade RFQ workflows.',
}

const HERO_GRADIENT = 'linear-gradient(160deg, #0d3347 0%, #185D7A 60%, #1e7399 100%)'

const JOURNEY = [
  'A customer searches.',
  'A trade desk suggests.',
  'A manufacturer documents and catalogues.',
  'A rep explains.',
  'A builder specifies.',
  'A contractor purchases.',
]

const FRICTIONS = [
  'Technical guides exist, but are scattered across print, websites and search results.',
  'Trade-desk staff provide valuable product knowledge, but there is often no simple way to preserve and carry that context into the customer’s next decision.',
  'The cognitive load of SKUs, suitability, availability, units of sale, pack sizes and system compatibility sits heavily with experienced staff members.',
  'Customers may identify the main profile, but miss the components required to complete the system.',
  'Trade desks spend minutes on each enquiry checking part numbers, specification details, pack sizes, component requirements, suggested accessories, BAL ratings and moisture suitability. Across thousands of interactions, those minutes accumulate into hours, weeks and significant operational effort.',
  'Manufacturers compress technical information into product packaging that is not necessarily easy for a customer to navigate at the point of purchase decision.',
]

const bodyText: React.CSSProperties = {
  fontSize: 'clamp(15px, 2vw, 17px)',
  lineHeight: 1.7,
  color: '#334155',
  margin: '0 0 18px',
}

export default function MyWorkPage() {
  return (
    <main style={{ minHeight: '100dvh', background: '#f5f7f9', display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{ background: HERO_GRADIENT, color: '#fff', padding: 'clamp(48px, 9vh, 88px) clamp(20px, 5vw, 56px) clamp(40px, 7vh, 64px)' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <a href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, letterSpacing: '-0.01em' }}>
            Build<span style={{ color: '#f97316' }}>Quote</span>
          </a>

          <p style={{ color: '#f97316', fontSize: 'clamp(10px, 1.4vw, 13px)', fontWeight: 700, letterSpacing: '0.18em', margin: 'clamp(20px, 4vh, 30px) 0 10px' }}>
            WORK IN PROGRESS
          </p>

          <h1 style={{
            fontFamily: 'var(--font-barlow-condensed), sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(30px, 6vw, 60px)',
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            margin: 0,
          }}>
            A portable bridge between<br />discovery and purchase
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 'clamp(15px, 2.2vw, 20px)', lineHeight: 1.55, maxWidth: '560px', margin: 'clamp(16px, 3vh, 24px) auto 0', fontWeight: 600 }}>
            Construction is a relay race. Product specification is the baton.
          </p>
        </div>
      </section>

      {/* ── Narrative ─────────────────────────────────────────── */}
      <section style={{ flex: 1, padding: 'clamp(36px, 6vh, 56px) clamp(20px, 5vw, 56px)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>

          <p style={bodyText}>
            The building-material journey from discovery to installation moves through many hands:
          </p>

          <ul style={{ margin: '0 0 22px', padding: 0, listStyle: 'none' }}>
            {JOURNEY.map((step, i) => (
              <li key={i} style={{
                display: 'flex', alignItems: 'baseline', gap: '12px',
                fontSize: 'clamp(15px, 2vw, 17px)', lineHeight: 1.7, color: '#0f172a', fontWeight: 600,
              }}>
                <span aria-hidden style={{ color: '#f97316', fontWeight: 800 }}>→</span>
                {step}
              </li>
            ))}
          </ul>

          <p style={{ ...bodyText, fontWeight: 700, color: '#0f172a' }}>
            At each exchange, the baton can be dropped.
          </p>

          {FRICTIONS.map((f, i) => (
            <p key={i} style={bodyText}>{f}</p>
          ))}

          {/* Takeaway */}
          <div style={{
            borderLeft: '4px solid #f97316',
            background: '#fff',
            borderRadius: '0 12px 12px 0',
            padding: '20px 24px',
            margin: '30px 0',
            boxShadow: '0 2px 12px rgba(15, 30, 45, 0.06)',
          }}>
            <p style={{ margin: 0, fontSize: 'clamp(16px, 2.4vw, 20px)', lineHeight: 1.55, fontWeight: 700, color: '#0d3347' }}>
              The challenge is not simply finding information. It is helping trusted product
              context survive the handoff.
            </p>
          </div>

          <p style={bodyText}>
            That observation sits at the centre of the work across BuildQuote Library, Trade
            Desk Search and builder/trade RFQ workflows.
          </p>

          {/* ── About ─────────────────────────────────────────── */}
          <h2 style={{
            fontFamily: 'var(--font-barlow-condensed), sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(24px, 3.6vw, 34px)',
            color: '#0d3347',
            margin: '44px 0 14px',
            letterSpacing: '-0.01em',
          }}>
            About Melia Grace
          </h2>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/melia-grace.png"
            alt="Melia Grace"
            width={128}
            height={128}
            style={{
              width: 'clamp(96px, 15vw, 128px)',
              height: 'clamp(96px, 15vw, 128px)',
              objectFit: 'cover',
              borderRadius: '50%',
              border: '3px solid #fff',
              boxShadow: '0 4px 16px rgba(15, 30, 45, 0.15)',
              float: 'right',
              margin: '4px 0 12px 18px',
            }}
          />

          <p style={bodyText}>
            Melia Grace is an independent product investigator and prototype builder based in
            South West Western Australia.
          </p>
          <p style={bodyText}>
            Her background spans long-term business ownership, customer-facing retail, building
            and hardware supply environments, and AI-native product development.
          </p>
          <p style={bodyText}>
            Her work focuses on complex problems that sit between people, systems and
            real-world behaviour — observing where journeys break down, tracing friction across
            customer experience, operations, information and technology, and building tangible
            concepts to test.
          </p>
          <p style={{ ...bodyText, fontWeight: 700, color: '#0f172a' }}>
            BuildQuote is the strongest expression of that approach.
          </p>
          <p style={bodyText}>
            The emerging model explores a lightweight, portable way to carry trusted context
            across discovery, technical understanding, staff conversation, quotation, purchase
            through to installation and satisfied users.
          </p>

          <p style={{
            margin: '34px 0 0',
            textAlign: 'center',
            fontFamily: 'var(--font-barlow-condensed), sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(20px, 3vw, 28px)',
            color: '#185D7A',
          }}>
            A portable bridge between discovery and purchase.
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ padding: '0 clamp(20px, 5vw, 56px) 36px', textAlign: 'center' }}>
        <a href="/" style={{ color: '#185D7A', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
          ← buildquote.com.au
        </a>
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: '10px 0 0' }}>
          BuildQuote — work in progress
        </p>
      </footer>
    </main>
  )
}
