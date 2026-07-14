'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const loginHref = `/login?next=${encodeURIComponent(next)}`

  const supabase = createSupabaseBrowserClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    const redirectTo = `${origin}/reset-password/update?next=${encodeURIComponent(next)}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Always show success — don't reveal whether an account exists for this email.
    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-page flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <a href={loginHref} className="text-text-muted text-sm hover:text-text-secondary transition-colors">← Back to sign in</a>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            Build<span className="text-brand">Quote</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">Reset your password</p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl shadow-[0_8px_32px_rgba(24,93,122,0.10)] p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[rgba(24,93,122,0.08)] flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185D7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16v16H4z" opacity="0" />
                  <path d="M22 6l-10 7L2 6" />
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Check your email</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                If an account exists for <strong className="text-text-primary">{email}</strong>, we&rsquo;ve sent a link to
                reset your password. The link expires in 1 hour.
              </p>
              <a href={loginHref} className="inline-block mt-6 text-navy font-semibold text-sm hover:underline">
                Return to sign in
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-text-primary mb-1">Forgot password?</h2>
              <p className="text-text-secondary text-sm mb-2 leading-relaxed">
                Enter the email address on your account and we&rsquo;ll send you a link to set a new password.
              </p>

              {error && (
                <div className="bg-error-bg border border-error-border text-error text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Email</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition"
                />
              </div>

              <button
                type="submit" disabled={loading || !email}
                className="w-full bg-navy text-white font-bold text-base py-3.5 rounded-xl transition hover:opacity-90 active:opacity-80 disabled:opacity-50 mt-1"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
