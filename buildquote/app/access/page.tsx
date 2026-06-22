'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AccessForm() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      const next = searchParams.get('next') || '/rfq'
      router.push(next)
    } else {
      setError('Incorrect access code. Try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Wordmark */}
        <div className="text-center">
          <h1 className="text-[2.2rem] font-bold tracking-tight text-heading">
            Build<span className="text-brand">Quote</span>
          </h1>
          <p className="text-xs text-text-muted mt-1 uppercase tracking-widest">
            buildquote.com.au
          </p>
        </div>

        {/* Gate card */}
        <div className="w-full bg-white border border-border-subtle rounded-2xl p-6 shadow-sm text-center">
          <div className="w-10 h-10 rounded-full bg-[rgba(24,93,122,0.08)] flex items-center justify-center mx-auto mb-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="8" width="12" height="8" rx="2" stroke="#185D7A" strokeWidth="1.5"/>
              <path d="M6 8V5.5a3 3 0 0 1 6 0V8" stroke="#185D7A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-text-primary font-bold text-base mb-1">Private testing</p>
          <p className="text-text-secondary text-sm mb-5 leading-relaxed">
            This platform is not open to the public yet.<br />Enter your access code to continue.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Access code"
              autoFocus
              className="w-full border border-border-subtle rounded-xl px-4 py-3 text-text-primary bg-surface-subtle placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition text-center tracking-widest"
            />
            {error && <p className="text-error text-sm">{error}</p>}
            <button
              type="submit"
              disabled={!password || loading}
              className="bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>

        <div className="flex gap-4 justify-center">
          <a href="/privacy" className="text-text-muted text-sm font-medium hover:text-text-secondary">Privacy Policy</a>
          <a href="/terms" className="text-text-muted text-sm font-medium hover:text-text-secondary">Terms of Use</a>
        </div>
      </div>
    </main>
  )
}

export default function AccessPage() {
  return (
    <Suspense fallback={null}>
      <AccessForm />
    </Suspense>
  )
}
