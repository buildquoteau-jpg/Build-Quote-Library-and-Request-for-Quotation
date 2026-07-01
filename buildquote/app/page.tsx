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

  // Only manufacturers with a hero image appear in the marquee (decorative —
  // keeps every card visual, no bare fallback tiles).
  const base = (await getManufacturers()).filter(m => m.hero_image_url?.trim())

  // Build one "half" wide enough to span large monitors, then duplicate it so
  // the -50% scroll loops seamlessly with no gap on wide screens.
  const repeats = base.length ? Math.max(2, Math.ceil(22 / base.length)) : 0
  const half = Array.from({ length: repeats }, () => base).flat()
  const marquee = half.length ? [...half, ...half] : []

  return (
    <main style={{ minHeight: '100dvh', background: HERO_GRADIENT, display: 'flex', flexDirection: 'column', color: '#fff' }}>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        width: '100%',
        maxWidth: '1040px',
        margin: '0 auto',
        paddingInline: 'clamp(20px, 5vw, 56px)',
        paddingTop: 'clamp(40px, 8vh, 80px)',
        paddingBottom: '8px',
      }}>

        <div style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800, letterSpacing: '-0.01em' }}>
          Build<span style={{ color: '#f97316' }}>Quote</span>
        </div>

        <p style={{ color: '#f97316', fontSize: 'clamp(10px, 1.4vw, 13px)', fontWeight: 700, letterSpacing: '0.18em', margin: 'clamp(22px, 4vh, 34px) 0 14px' }}>
          FREE · NO LOGIN
        </p>

        <h1 style={{
          fontFamily: 'var(--font-barlow-condensed), sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(30px, 7vw, 76px)',
          lineHeight: 1.0,
          letterSpacing: '-0.01em',
          margin: 0,
        }}>
          The Australian Building<br />Materials Library
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 'clamp(14px, 2.2vw, 20px)', lineHeight: 1.5, maxWidth: 'min(520px, 90%)', margin: 'clamp(14px, 2.5vh, 22px) auto 0' }}>
          Build a list, link to local stockists — in seconds.
        </p>

        <a
          href="/library"
          style={{
            display: 'inline-block',
            background: '#f97316',
            color: '#fff',
            fontWeight: 700,
            fontSize: 'clamp(15px, 2vw, 19px)',
            padding: 'clamp(13px, 1.6vh, 18px) clamp(30px, 5vw, 48px)',
            borderRadius: '12px',
            textDecoration: 'none',
            marginTop: 'clamp(22px, 4vh, 30px)',
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

      {/* ── Manufacturer marquee (decorative) — hidden for now ── */}

      {/* ── Footer ────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '0 clamp(20px, 5vw, 56px) 22px' }}>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/terms" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>Terms of Use</a>
        </div>
      </div>

    </main>
  )
}
