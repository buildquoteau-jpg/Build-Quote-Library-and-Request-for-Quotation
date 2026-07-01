'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'


const BUILD_TYPES = [
  'New Home', 'Renovation', 'Extension', 'Swimming Pool',
  'Landscape', 'Commercial', 'Other',
]

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [step, setStep] = useState<'account' | 'profile'>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Account fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Profile fields
  const [builderName, setBuilderName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [abn, setAbn] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyAddressPlaceId, setCompanyAddressPlaceId] = useState('')
  const [officePhone, setOfficePhone] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')

  const addressRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  useEffect(() => {
    if (step !== 'profile') return

    const initAutocomplete = () => {
      if (!addressRef.current || !window.google) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressRef.current, {
        componentRestrictions: { country: 'au' },
        fields: ['formatted_address', 'place_id'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        setCompanyAddress(place.formatted_address || '')
        setCompanyAddressPlaceId(place.place_id || '')
      })
    }

    if (window.google) {
      initAutocomplete()
    } else {
      window.initGooglePlaces = initAutocomplete
      if (!document.getElementById('google-maps-script')) {
        const script = document.createElement('script')
        script.id = 'google-maps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGooglePlaces`
        script.async = true
        document.head.appendChild(script)
      }
    }
  }, [step])

  async function handleAccountStep(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setStep('profile')
  }

  async function handleProfileStep(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Server-side registration — uses service role to bypass email confirmation + RLS
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        profile: {
          builder_name: builderName,
          company_name: companyName,
          abn,
          company_address: companyAddress,
          company_address_place_id: companyAddressPlaceId,
          office_phone: officePhone,
          mobile_phone: mobilePhone,
        },
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Registration failed')
      setLoading(false)
      return
    }

    // Sign in immediately after account creation, then return to `next` if the
    // user arrived from a gated flow (e.g. the RFQ "Request a Quote" round-trip).
    const next = new URLSearchParams(window.location.search).get('next')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('Account created — please sign in.')
      router.push(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
      return
    }

    router.push(next || '/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-page flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <a href="/login" className="text-text-muted text-sm hover:text-text-secondary transition-colors">← Back to sign in</a>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            Build<span className="text-brand">Quote</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">Builder Portal — Register</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(['account', 'profile'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step === s || (s === 'account' && step === 'profile') ? 'bg-navy text-white' : 'bg-ui-dark text-text-muted'}`}>
                {s === 'account' && step === 'profile' ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-semibold ${step === s ? 'text-navy' : 'text-text-muted'}`}>
                {s === 'account' ? 'Account' : 'Profile'}
              </span>
              {i === 0 && <div className="flex-1 h-px bg-border-subtle ml-1" />}
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl shadow-[0_8px_32px_rgba(24,93,122,0.10)] p-8">
          {error && (
            <div className="bg-error-bg border border-error-border text-error text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {step === 'account' && (
            <form onSubmit={handleAccountStep} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-text-primary mb-2">Create account</h2>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Confirm password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
              </div>

              <button type="submit"
                className="w-full bg-navy text-white font-bold text-base py-3.5 rounded-xl transition hover:opacity-90 mt-1">
                Continue
              </button>
            </form>
          )}

          {step === 'profile' && (
            <form onSubmit={handleProfileStep} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-text-primary mb-2">Your details</h2>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Your name</label>
                <input type="text" required value={builderName} onChange={e => setBuilderName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Company name</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="Smith Building Pty Ltd"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">ABN / ACN</label>
                <input type="text" value={abn} onChange={e => setAbn(e.target.value)}
                  placeholder="12 345 678 901"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Company address</label>
                <input ref={addressRef} type="text" value={companyAddress}
                  onChange={e => { setCompanyAddress(e.target.value); setCompanyAddressPlaceId('') }}
                  placeholder="Start typing your address…"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Office phone</label>
                  <input type="tel" value={officePhone} onChange={e => setOfficePhone(e.target.value)}
                    placeholder="08 9999 0000"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Mobile</label>
                  <input type="tel" value={mobilePhone} onChange={e => setMobilePhone(e.target.value)}
                    placeholder="0400 000 000"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm text-text-primary bg-surface focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
                </div>
              </div>

              <button type="submit" disabled={loading || !builderName}
                className="w-full bg-brand text-white font-bold text-base py-3.5 rounded-xl transition hover:opacity-90 disabled:opacity-50 mt-1">
                {loading ? 'Creating account…' : 'Create my account'}
              </button>

              <button type="button" onClick={() => setStep('account')}
                className="text-sm text-text-muted text-center hover:underline">
                ← Back
              </button>
            </form>
          )}

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-navy font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </main>
  )
}
