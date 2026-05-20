'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { startAuthentication } from '@simplewebauthn/browser'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <main className="min-h-screen bg-page flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            Build<span className="text-brand">Quote</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">Builder Portal</p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl shadow-[0_8px_32px_rgba(24,93,122,0.10)] p-8">
          <h2 className="text-xl font-bold text-text-primary mb-6">Sign in</h2>

          {error && (
            <div className="bg-error-bg border border-error-border text-error text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white font-bold text-base py-3.5 rounded-xl transition hover:opacity-90 active:opacity-80 disabled:opacity-50 mt-1"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-3 text-xs text-text-muted font-medium">or</span>
            </div>
          </div>

          <button
            onClick={handlePasskeyLogin}
            disabled={passkeyLoading || !email}
            className="w-full flex items-center justify-center gap-2 border border-border text-text-primary font-semibold text-sm py-3 rounded-xl hover:bg-surface-subtle transition disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            {passkeyLoading ? 'Checking passkey…' : 'Sign in with Face ID / Passkey'}
          </button>

          <p className="text-center text-sm text-text-muted mt-6">
            No account?{' '}
            <a href="/register" className="text-navy font-semibold hover:underline">
              Register here
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
