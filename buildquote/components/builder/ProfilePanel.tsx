'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { startRegistration } from '@simplewebauthn/browser'


interface Props {
  user: User
  profile: any
  onClose: () => void
  inline?: boolean
}

export default function ProfilePanel({ user, profile, onClose, inline = false }: Props) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [tab, setTab] = useState<'details' | 'security'>('details')

  // Profile fields
  const [builderName, setBuilderName] = useState(profile?.builder_name || '')
  const [companyName, setCompanyName] = useState(profile?.company_name || '')
  const [abn, setAbn] = useState(profile?.abn || '')
  const [companyAddress, setCompanyAddress] = useState(profile?.company_address || '')
  const [companyAddressPlaceId, setCompanyAddressPlaceId] = useState(profile?.company_address_place_id || '')
  const [officePhone, setOfficePhone] = useState(profile?.office_phone || '')
  const [mobilePhone, setMobilePhone] = useState(profile?.mobile_phone || '')
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url || '')

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')

  // Security
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [passkeyMsg, setPasskeyMsg] = useState('')
  const [passkeyLoading, setPasskeyLoading] = useState(false)

  const addressRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  useEffect(() => {
    const init = () => {
      if (!addressRef.current || !window.google) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressRef.current, {
        componentRestrictions: { country: 'au' },
        fields: ['formatted_address', 'place_id'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const p = autocompleteRef.current.getPlace()
        setCompanyAddress(p.formatted_address || '')
        setCompanyAddressPlaceId(p.place_id || '')
      })
    }
    if (window.google) { init() }
    else {
      window.initProfilePlaces = init
      if (!document.getElementById('google-maps-script')) {
        const s = document.createElement('script')
        s.id = 'google-maps-script'
        s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initProfilePlaces`
        s.async = true
        document.head.appendChild(s)
      }
    }
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')

    // Use the user prop directly — already validated server-side, no extra round-trip
    if (!user?.id) {
      setSaveMsg('Error: Session not found — please sign out and sign back in.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('builders').update({
      builder_name: builderName,
      company_name: companyName,
      abn,
      company_address: companyAddress,
      company_address_place_id: companyAddressPlaceId,
      office_phone: officePhone,
      mobile_phone: mobilePhone,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaving(false)
    if (error) {
      setSaveMsg(`Error: ${error.message}`)
    } else {
      setSaveMsg('Profile saved!')
      router.refresh()
      setTimeout(() => {
        setSaveMsg('')
        if (!inline) onClose()
      }, 1500)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoError('')

    // Normalise extension — iOS may give HEIC; fall back to jpg so browsers can display it
    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const ext = rawExt === 'heic' || rawExt === 'heif' ? 'jpg' : rawExt
    const path = `${user.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('builder-logos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setLogoError(`Upload failed: ${uploadError.message}`)
      setLogoUploading(false)
      return
    }

    const { data } = supabase.storage.from('builder-logos').getPublicUrl(path)
    // Add cache-buster so the browser shows the new image even when re-uploading the same filename
    const url = `${data.publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('builders')
      .update({ logo_url: url })
      .eq('id', user.id)

    if (updateError) {
      setLogoError(`Failed to save logo: ${updateError.message}`)
    } else {
      setLogoUrl(url)
    }
    setLogoUploading(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg('')
    if (newPassword !== confirmNewPassword) { setPwMsg('Passwords do not match'); return }
    if (newPassword.length < 8) { setPwMsg('Password must be at least 8 characters'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    setPwMsg(error ? `Error: ${error.message}` : 'Password updated!')
    if (!error) { setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('') }
    setTimeout(() => setPwMsg(''), 4000)
  }

  async function handleRegisterPasskey() {
    setPasskeyLoading(true)
    setPasskeyMsg('')
    try {
      const optRes = await fetch('/api/auth/passkey/register-options', { method: 'POST' })
      if (!optRes.ok) throw new Error('Could not start passkey registration')
      const options = await optRes.json()
      const credential = await startRegistration({ optionsJSON: options })
      const verRes = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })
      if (!verRes.ok) {
        const d = await verRes.json()
        throw new Error(d.error || 'Passkey registration failed')
      }
      setPasskeyMsg('Passkey registered! You can now use Face ID / passkey to sign in.')
    } catch (err) {
      setPasskeyMsg(err instanceof Error ? err.message : 'Passkey registration failed')
    } finally {
      setPasskeyLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const inner = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Company logo" className="w-11 h-11 rounded-xl object-cover border border-border-subtle" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-navy/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#185D7A" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          )}
          <div>
            <p className="font-bold text-text-primary text-sm">{builderName || 'My Profile'}</p>
            <p className="text-text-muted text-xs">{user.email}</p>
          </div>
        </div>
        {!inline && (
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-border-subtle">
        {(['details', 'security'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${tab === t ? 'border-navy text-navy' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            {t === 'details' ? 'My Details' : 'Security'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'details' && (
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">Company Logo</label>
              <div className="flex items-center gap-3">
                {logoUrl && <img src={logoUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-border-subtle" />}
                <label className="cursor-pointer border border-border text-text-secondary text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-surface-subtle transition">
                  {logoUploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
                  <input type="file" accept="image/*,image/heic,image/heif" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                </label>
              </div>
              {logoError && (
                <p className="text-xs font-semibold text-error mt-1">{logoError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">Your name</label>
              <input value={builderName} onChange={e => setBuilderName(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">Company name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">ABN / ACN</label>
              <input value={abn} onChange={e => setAbn(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">Company address</label>
              <input ref={addressRef} value={companyAddress}
                onChange={e => { setCompanyAddress(e.target.value); setCompanyAddressPlaceId('') }}
                placeholder="Start typing…"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Office phone</label>
                <input value={officePhone} onChange={e => setOfficePhone(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Mobile</label>
                <input value={mobilePhone} onChange={e => setMobilePhone(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-navy text-white font-bold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saveMsg && (
              <div className={`text-sm font-semibold rounded-xl px-4 py-3 text-center ${saveMsg.startsWith('Error') ? 'bg-error-bg text-error' : 'bg-teal/10 text-teal'}`}>
                {saveMsg}
              </div>
            )}
          </form>
        )}

        {tab === 'security' && (
          <div className="flex flex-col gap-6">
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <h3 className="font-bold text-text-primary">Change Password</h3>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">New password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                  placeholder="Min 8 characters"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5">Confirm new password</label>
                <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required
                  placeholder="Repeat password"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy transition" />
              </div>
              {pwMsg && (
                <div className={`text-sm font-semibold rounded-xl px-4 py-3 ${pwMsg.startsWith('Error') || pwMsg.includes('match') || pwMsg.includes('least') ? 'bg-error-bg text-error' : 'bg-teal/10 text-teal'}`}>
                  {pwMsg}
                </div>
              )}
              <button type="submit" disabled={pwSaving}
                className="w-full bg-navy text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition">
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </form>

            <div className="border-t border-border-subtle pt-6">
              <h3 className="font-bold text-text-primary mb-1">Face ID / Passkey</h3>
              <p className="text-sm text-text-muted mb-4">Register this device for biometric login (FaceID, Windows Hello, fingerprint).</p>
              {passkeyMsg && (
                <div className={`text-sm font-semibold rounded-xl px-4 py-3 mb-4 ${passkeyMsg.includes('failed') || passkeyMsg.includes('Error') ? 'bg-error-bg text-error' : 'bg-teal/10 text-teal'}`}>
                  {passkeyMsg}
                </div>
              )}
              <button onClick={handleRegisterPasskey} disabled={passkeyLoading}
                className="w-full flex items-center justify-center gap-2 border border-navy text-navy font-bold py-3 rounded-xl hover:bg-navy/5 disabled:opacity-50 transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                {passkeyLoading ? 'Registering…' : 'Register this device'}
              </button>
            </div>

            <div className="border-t border-border-subtle pt-6">
              <button onClick={handleSignOut}
                className="w-full border border-error text-error font-bold py-3 rounded-xl hover:bg-error-bg transition">
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )

  if (inline) {
    return (
      <div className="bg-surface border border-border-subtle rounded-2xl shadow-sm max-w-lg mx-auto flex flex-col overflow-hidden">
        {inner}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-end">
      <div className="bg-surface h-full sm:h-auto sm:max-h-[90vh] w-full sm:w-[420px] sm:rounded-l-2xl shadow-2xl flex flex-col overflow-hidden">
        {inner}
      </div>
    </div>
  )
}
