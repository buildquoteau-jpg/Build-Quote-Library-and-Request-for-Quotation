'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { startAuthentication } from '@simplewebauthn/browser'

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}

const BENEFITS = [
  'Send professional requests for quotation straight to your preferred local suppliers',
  'Store job information and reuse it across quotes',
  'Save your favourite products for one-tap requests',
  'Keep your preferred suppliers in one place',
]

function Check() {
  return (
    <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(249,115,22,0.9)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </span>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const registerHref = `/register?next=${encodeURIComponent(next)}`

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createSupabaseBrowserClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  async function handlePasskeyLogin() {
    setPasskeyLoading(true)
    setError('')
    try {
      const optionsRes = await fetch('/api/auth/passkey/authenticate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!optionsRes.ok) {
        const d = await optionsRes.json()
        throw new Error(d.error || 'Could not start passkey login')
      }
      const options = await optionsRes.json()
      const credential = await startAuthentication({ optionsJSON: options })
      const verifyRes = await fetch('/api/auth/passkey/authenticate-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credential }),
      })
      if (!verifyRes.ok) {
        const d = await verifyRes.json()
        throw new Error(d.error || 'Passkey verification failed')
      }
      const { token_hash, email: userEmail } = await verifyRes.json()
      await supabase.auth.verifyOtp({ token_hash, type: 'email', email: userEmail })
      router.push(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey login failed')
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100dvh', background: '#f5f7f9' }} className="grid grid-cols-1 lg:grid-cols-2">

      {/* ── Left — value proposition ──────────────────────────────────────── */}
      <section
        className="hidden lg:flex"
        style={{
          flexDirection: 'column', justifyContent: 'center',
          background: 'linear-gradient(160deg, #0d3347 0%, #185D7A 60%, #1e7399 100%)',
          color: '#fff', padding: '64px 56px',
        }}
      >
        <div style={{ maxWidth: '460px' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.01em', marginBottom: '28px' }}>
            Build<span style={{ color: '#f97316' }}>Quote</span>
          </div>
          <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f97316', marginBottom: '14px' }}>
            Request for Quotation
          </span>
          <h1 style={{ margin: '0 0 16px', fontSize: 'clamp(30px, 3.4vw, 44px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', fontFamily: 'var(--font-barlow-condensed), sans-serif' }}>
            Requests for quotation,<br />made simple.
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: '16px', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
            BuildQuote lets you send professional requests for quotation straight to your preferred
            local suppliers — and it&rsquo;s free to sign up.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {BENEFITS.map(b => (
              <li key={b} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '15px', lineHeight: 1.45, color: 'rgba(255,255,255,0.92)' }}>
                <Check />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Right — auth card ─────────────────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="w-full max-w-sm">

          <div className="mb-6">
            <a href="/" className="text-text-muted text-sm hover:text-text-secondary transition-colors">← Back to home</a>
          </div>

          {/* Compact pitch — shown on mobile where the left panel is hidden */}
          <div className="lg:hidden text-center mb-7">
            <div className="text-2xl font-bold tracking-tight text-heading">
              Build<span className="text-brand">Quote</span>
            </div>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">
              Send professional requests for quotation straight to your preferred local suppliers.
              Free to sign up.
            </p>
          </div>

          <div className="bg-surface border border-border-subtle rounded-2xl shadow-[0_8px_32px_rgba(24,93,122,0.10)] p-8">
            <h2 className="text-xl font-bold text-text-primary mb-1">Get started with BuildQuote</h2>
            <p className="text-sm text-text-muted mb-6">Create a free account to send your request for quotation.</p>

            {error && (
              <div className="bg-error-bg border border-error-border text-error text-sm rounded-xl px-4 py-3 mb-5">
                {error}
              </div>
            )}

            {/* Primary — create free account */}
            <a
              href={registerHref}
              className="w-full flex items-center justify-center gap-2 bg-brand text-white font-bold text-base py-3.5 rounded-xl transition hover:opacity-90 active:opacity-80"
              style={{ background: '#f97316', textDecoration: 'none' }}
            >
              Create your free account
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </a>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-subtle" /></div>
              <div className="relative flex justify-center"><span className="bg-surface px-3 text-xs text-text-muted font-medium">Already a BuildQuote member? Sign in</span></div>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Email</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition"
                  />
                  <button
                    type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-navy text-white font-bold text-base py-3.5 rounded-xl transition hover:opacity-90 active:opacity-80 disabled:opacity-50 mt-1"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <button
              onClick={handlePasskeyLogin} disabled={passkeyLoading || !email}
              className="w-full flex items-center justify-center gap-2 border border-border text-text-primary font-semibold text-sm py-3 rounded-xl hover:bg-surface-subtle transition disabled:opacity-40 mt-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {passkeyLoading ? 'Checking passkey…' : 'Sign in with Face ID / Passkey'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
