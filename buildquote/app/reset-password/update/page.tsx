'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function UpdatePasswordPage() {
  return <Suspense><UpdatePasswordForm /></Suspense>
}

function UpdatePasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const supabase = createSupabaseBrowserClient()

  const [ready, setReady] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // The recovery link puts the user into a temporary session. The Supabase
  // browser client auto-detects the code/token in the URL and establishes it;
  // we confirm a session (or the PASSWORD_RECOVERY event) is present before
  // showing the form.
  useEffect(() => {
    let active = true

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session) {
        setReady(true)
      } else {
        // Give the client a moment to process the URL, then check again.
        setTimeout(async () => {
          if (!active) return
          const { data: retry } = await supabase.auth.getSession()
          if (retry.session) setReady(true)
          else setLinkError('This reset link is invalid or has expired. Please request a new one.')
        }, 1200)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
    setTimeout(() => {
      router.push(next)
      router.refresh()
    }, 1200)
  }

  return (
    <main className="min-h-screen bg-page flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            Build<span className="text-brand">Quote</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">Set a new password</p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl shadow-[0_8px_32px_rgba(24,93,122,0.10)] p-8">
          {linkError ? (
            <div className="text-center">
              <div className="bg-error-bg border border-error-border text-error text-sm rounded-xl px-4 py-3 mb-5">
                {linkError}
              </div>
              <a href="/reset-password" className="text-navy font-semibold text-sm hover:underline">
                Request a new reset link →
              </a>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Password updated</h2>
              <p className="text-text-secondary text-sm">Taking you to your dashboard…</p>
            </div>
          ) : !ready ? (
            <p className="text-text-secondary text-sm text-center py-4">Verifying your reset link…</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-text-primary mb-1">Choose a new password</h2>

              {error && (
                <div className="bg-error-bg border border-error-border text-error text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition"
                  />
                  <button
                    type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Confirm new password</label>
                <input
                  type={showPassword ? 'text' : 'password'} required value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition"
                />
              </div>

              <button
                type="submit" disabled={loading || !password || !confirmPassword}
                className="w-full bg-navy text-white font-bold text-base py-3.5 rounded-xl transition hover:opacity-90 active:opacity-80 disabled:opacity-50 mt-1"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
