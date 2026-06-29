import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getManufacturers } from '@/lib/data/getSystems'

const HERO_GRADIENT = 'linear-gradient(160deg, #0d3347 0%, #185D7A 60%, #1e7399 100%)'

export default async function Home() {
  // Auth-aware: returning signed-in builders are recognised and linked to their
  // portal; anonymous visitors get a quiet sign-in link. The landing needs no
  // login — the library is free and open.
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let builderName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('builders')
      .select('builder_name, company_name')
      .eq('id', user.id)
      .maybeSingle()
    builderName = profile?.builder_name || profile?.company_name || null
  }

  const manufacturers = await getManufacturers()
  // Duplicate the list so the marquee can loop seamlessly (-50% translate).
  const marquee = manufacturers.length > 0 ? [...manufacturers, ...manufacturers] : []

  return (
    <main style={{ minHeight: '100vh', background: HERO_GRADIENT, display: 'flex', flexDirection: 'column', color: '#fff' }}>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '56px 24px 8px' }}>

        <div style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, letterSpacing: '-0.01em' }}>
          Build<span style={{ color: '#f97316' }}>Quote</span>
        </div>

        <p style={{ color: '#f97316', fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', margin: '30px 0 14px' }}>
          FREE · NO LOGIN
        </p>

        <h1 style={{
          fontFamily: 'var(--font-barlow-condensed), sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(34px, 7vw, 56px)',
          lineHeight: 1.0,
          letterSpacing: '-0.01em',
          margin: 0,
        }}>
          The Australian Building<br />Materials Library
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 'clamp(14px, 2vw, 16px)', lineHeight: 1.5, maxWidth: '400px', margin: '18px auto 0' }}>
          Build a list, link to local stockists — in seconds.
        </p>

        <a
          href="/library"
          style={{
            display: 'inline-block',
            background: '#f97316',
            color: '#fff',
            fontWeight: 700,
            fontSize: '16px',
            padding: '14px 38px',
            borderRadius: '12px',
            textDecoration: 'none',
            marginTop: '28px',
            boxShadow: '0 10px 26px rgba(0,0,0,0.22)',
          }}
        >
          Browse the Library →
        </a>

        {user ? (
          <a href="/dashboard" style={{ display: 'block', color: 'rgba(255,255,255,0.82)', fontSize: '13px', fontWeight: 600, marginTop: '16px', textDecoration: 'none' }}>
            {builderName ? `Welcome back, ${builderName} — Builder Portal →` : 'Go to your Builder Portal →'}
          </a>
        ) : (
          <a href="/login" style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, marginTop: '16px', textDecoration: 'none' }}>
            Already a builder? Sign in →
          </a>
        )}
      </div>

      {/* ── Manufacturer marquee ──────────────────────────────── */}
      {marquee.length > 0 && (
        <div className="bq-marquee" style={{ overflow: 'hidden', padding: '36px 0 12px' }} aria-label="Featured manufacturers">
          <div className="bq-marquee-track" style={{ display: 'flex', gap: '14px' }}>
            {marquee.map((m, i) => {
              const hero = m.hero_image_url?.trim()
              const posY = m.hero_image_position_y ?? 50
              return (
                <a
                  key={`${m.id}-${i}`}
                  href="/library"
                  aria-hidden={i >= manufacturers.length ? true : undefined}
                  tabIndex={i >= manufacturers.length ? -1 : undefined}
                  style={{
                    flex: '0 0 160px',
                    width: '160px',
                    height: '96px',
                    borderRadius: '11px',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '10px 12px',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.14)',
                    backgroundImage: hero
                      ? `linear-gradient(rgba(13,30,45,0.15), rgba(13,30,45,0.66)), url(${hero})`
                      : 'linear-gradient(135deg, #0d3347 0%, #2a6f8f 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: `center ${posY}%`,
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-barlow-condensed), sans-serif',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: '#fff',
                    lineHeight: 1.1,
                    textShadow: '0 1px 4px rgba(0,0,0,0.55)',
                  }}>
                    {m.name}
                  </span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '0 0 22px' }}>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/terms" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>Terms of Use</a>
        </div>
      </div>

    </main>
  )
}
