import { ImageResponse } from 'next/og'

// Branded 1200×630 fallback image for System Card link previews (og:image /
// twitter:image) when a system has no hero_image_url. Generated on-demand via
// Vercel's edge image-response support — no static asset, no new dependency
// (next/og ships inside Next.js). Optional ?title=&manufacturer= personalise
// the card even without a real product photo.

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = (searchParams.get('title') ?? '').slice(0, 90)
  const manufacturer = (searchParams.get('manufacturer') ?? '').slice(0, 60)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #0f3a4d 0%, #185D7A 55%, #1a7a9e 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#ffffff' }}>Build</span>
          <span style={{ color: '#f97316' }}>Quote</span>
        </div>

        {/* System title / generic fallback */}
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '92%' }}>
          {manufacturer && (
            <div style={{ fontSize: 26, fontWeight: 700, color: '#8fd3ee', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {manufacturer}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: title ? 64 : 56, fontWeight: 800, color: '#ffffff', lineHeight: 1.08, letterSpacing: '-0.02em' }}>
            {title || 'System Card'}
          </div>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: 18 }}>
            Product specifications · components · installation resources
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
