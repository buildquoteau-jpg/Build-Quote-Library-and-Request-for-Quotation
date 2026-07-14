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
  "Store job information and reuse it across RFQ's",
  'Save your favourite products for one-tap requests',
  'Keep your preferred suppliers in one place',
]

function Check() {
  return (
    <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(249,115,22,0.95)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
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
    <main style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #0d3347 0%, #185D7A 60%, #1e7399 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '18px 20px 56px', fontFamily: 'var(--font-barlow), sans-serif',
    }}>

      {/* Back to Library — obvious nav */}
      <div style={{ width: '100%', maxWidth: '660px' }}>
        <a href="/library" style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          color: '#fff', fontSize: '14px', fontWeight: 700, textDecoration: 'none',
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '10px', padding: '8px 14px',
        }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M10 3.5L5.5 8L10 12.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Library
        </a>
      </div>

      {/* Header info */}
      <div style={{ width: '100%', maxWidth: '660px', textAlign: 'center', color: '#fff', marginTop: '26px' }}>
        <h1 style={{
          margin: '0 0 16px', fontFamily: 'var(--font-barlow-condensed), sans-serif',
          fontWeight: 800, fontSize: 'clamp(20px, 3.1vw, 32px)', lineHeight: 1.14, letterSpacing: '-0.01em',
        }}>
          Build<span style={{ color: '#f97316' }}>Quote</span> —<br />
          Request for building materials quotation —<br />
          made simple
        </h1>

        <p style={{ margin: '0 auto 22px', maxWidth: '500px', fontSize: '15.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.82)' }}>
          BuildQuote lets you send professional <strong style={{ color: '#fff', fontWeight: 800 }}>requests for quotation</strong> straight
          to your <strong style={{ color: '#fff', fontWeight: 800 }}>preferred local suppliers</strong>.
        </p>

        <ul style={{ listStyle: 'none', margin: '0 auto 20px', padding: 0, maxWidth: '430px', display: 'flex', flexDirection: 'column', gap: '11px', textAlign: 'left' }}>
          {BENEFITS.map(b => (
            <li key={b} style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', fontSize: '16px', lineHeight: 1.5, color: 'rgba(255,255,255,0.94)' }}>
              <Check />
              {b}
            </li>
          ))}
        </ul>

        <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f97316' }}>
          Simple RFQ&rsquo;s · Free sign-up
        </p>
      </div>

      {/* Compact sign-up block */}
      <div style={{ width: '100%', maxWidth: '400px', marginTop: '26px' }}>
        <div className="bg-surface border border-border-subtle rounded-2xl shadow-[0_10px_40px_rgba(8,30,42,0.28)] p-7">

          {error && (
            <div className="bg-error-bg border border-error-border text-error text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {/* Primary — create free account */}
          <a
            href={registerHref}
            className="w-full flex items-center justify-center gap-2 text-white font-bold text-base py-3.5 rounded-xl transition hover:opacity-90 active:opacity-80"
            style={{ background: '#f97316', textDecoration: 'none' }}
          >
            Create your free account
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>

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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-text-secondary">Password</label>
                <a
                  href={`/reset-password?next=${encodeURIComponent(next)}`}
                  className="text-sm font-semibold text-navy hover:underline"
                >
                  Forgot password?
                </a>
              </div>
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
    </main>
  )
}
