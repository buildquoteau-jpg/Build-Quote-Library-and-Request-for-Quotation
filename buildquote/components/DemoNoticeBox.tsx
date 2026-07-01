'use client'

import { useEffect, useState } from 'react'

type Field = { name: string; label: string; type?: string; placeholder?: string; required?: boolean }

export function DemoNoticeBox({
  storageKey,
  badge = 'Pre-launch · Demo',
  title,
  body,
  ctaLabel,
  submitType,
  fields,
  successMessage,
  maxWidth = '1100px',
  defaults = {},
}: {
  storageKey: string
  badge?: string
  title: string
  body: string
  ctaLabel: string
  submitType: string
  fields: Field[]
  successMessage: string
  maxWidth?: string
  defaults?: Record<string, string>
}) {
  const [hidden, setHidden] = useState(true)   // start hidden until we've checked localStorage (avoids flash)
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(defaults)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      if (localStorage.getItem(`bq_notice_${storageKey}`) === 'dismissed') return
    } catch { /* ignore */ }
    setHidden(false)
  }, [storageKey])

  function dismiss() {
    setHidden(true)
    try { localStorage.setItem(`bq_notice_${storageKey}`, 'dismissed') } catch { /* ignore */ }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/demo-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: submitType, fields: values }),
      })
      const data = await res.json()
      if (data.success) setDone(true)
      else setError(data.error || 'Something went wrong. Please try again.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (hidden) return null

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', border: '1.5px solid #d1d9e0', borderRadius: '10px',
    padding: '10px 12px', fontSize: '14px', color: '#0f172a', background: '#fff', outline: 'none',
  }

  return (
    <div style={{ maxWidth, margin: '0 auto', padding: '16px 16px 0' }}>
      <div style={{
        position: 'relative', background: '#fff', border: '1px solid #d8e3e9',
        borderLeft: '4px solid #f97316', borderRadius: '14px',
        boxShadow: '0 4px 18px rgba(15,30,45,0.06)', padding: '18px 20px',
      }}>
        <button onClick={dismiss} aria-label="Dismiss" style={{
          position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: '20px', lineHeight: 1, color: '#9ca3af', padding: '4px',
        }}>×</button>

        <span style={{ display: 'inline-block', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f97316', marginBottom: '7px' }}>
          {badge}
        </span>
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#0f2d3d', letterSpacing: '-0.01em', paddingRight: '20px' }}>
          {title}
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.55, maxWidth: '760px' }}>
          {body}
        </p>

        {done ? (
          <p style={{ margin: '14px 0 0', fontSize: '14px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            {successMessage}
          </p>
        ) : !open ? (
          <button onClick={() => setOpen(true)} style={{
            marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: '#185D7A', color: '#fff', fontWeight: 700, fontSize: '14px',
            border: 'none', borderRadius: '10px', padding: '10px 18px', cursor: 'pointer',
          }}>
            {ctaLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        ) : (
          <form onSubmit={submit} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '520px' }}>
            {fields.map(f => (
              <div key={f.name}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>{f.label}</label>
                <input
                  type={f.type ?? 'text'} required={f.required}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#185D7A' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#d1d9e0' }}
                />
              </div>
            ))}
            {error && <p style={{ margin: 0, fontSize: '12.5px', color: '#dc2626', fontWeight: 600 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="submit" disabled={busy} style={{
                background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none',
                borderRadius: '10px', padding: '10px 20px', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
              }}>
                {busy ? 'Sending…' : 'Submit'}
              </button>
              <button type="button" onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
