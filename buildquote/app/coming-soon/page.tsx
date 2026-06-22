'use client'

import { useState } from 'react'

type Role = 'Builder' | 'Supplier' | 'Manufacturer'

export default function ComingSoon() {
  const [role, setRole] = useState<Role | null>(null)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Something went wrong')
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  const roles: Role[] = ['Builder', 'Supplier', 'Manufacturer']

  return (
    <main className="min-h-screen bg-page flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6">

        {/* Wordmark */}
        <div>
          <h1 className="text-[2.2rem] font-bold tracking-tight text-heading">
            Build<span className="text-brand">Quote</span>
          </h1>
          <p className="text-xs text-text-muted mt-1 uppercase tracking-widest">
            buildquote.com.au
          </p>
        </div>

        {/* Coming soon badge */}
        <span className="inline-block bg-brand-subtle text-brand font-bold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full border border-brand/20">
          Coming Soon
        </span>

        {/* Headline */}
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-extrabold tracking-tight text-text-primary leading-snug">
            Request for quotation,<br />made simple.
          </p>
          <p className="text-text-secondary text-base leading-relaxed">
            We&rsquo;re putting the finishing touches on BuildQuote. Register your interest and we&rsquo;ll let you know the moment it&rsquo;s ready.
          </p>
        </div>

        {/* Registration form */}
        {status === 'success' ? (
          <div className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-6 py-8 flex flex-col items-center gap-3">
            <svg className="w-10 h-10 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-text-primary font-bold text-lg">You&rsquo;re on the list!</p>
            <p className="text-text-secondary text-sm">We&rsquo;ll be in touch at <span className="font-semibold text-text-primary">{email}</span> when BuildQuote launches.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            {/* Role selector */}
            <div className="flex flex-col gap-2">
              <p className="text-text-primary font-semibold text-sm text-left">
                Are you a&hellip;
              </p>
              <div className="flex gap-2">
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                      role === r
                        ? 'bg-brand text-white border-brand'
                        : 'bg-surface-subtle text-text-secondary border-border-subtle hover:border-brand/40 hover:text-brand'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-text-primary font-semibold text-sm text-left" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-border-subtle rounded-xl px-4 py-3 text-text-primary text-base bg-surface-subtle placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
              />
            </div>

            {errorMsg && (
              <p className="text-error text-sm text-left">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={!role || !email || status === 'loading'}
              className="bg-brand hover:bg-brand-hover active:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base px-8 py-4 rounded-2xl transition-colors shadow-[0_10px_24px_rgba(249,115,22,0.22)]"
            >
              {status === 'loading' ? 'Registering…' : 'Register my interest'}
            </button>
          </form>
        )}

        {/* Footer links */}
        <div className="flex gap-4 justify-center pt-2">
          <a href="/privacy" className="text-text-muted text-sm font-medium hover:text-text-secondary">Privacy Policy</a>
          <a href="/terms" className="text-text-muted text-sm font-medium hover:text-text-secondary">Terms of Use</a>
        </div>
      </div>
    </main>
  )
}
