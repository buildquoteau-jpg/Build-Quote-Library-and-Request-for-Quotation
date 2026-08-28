'use client'

// "Ask about this product" — the builder-facing entry point to the AI
// Knowledge Gap & Feedback Loop (design doc addendum §A5). One question, one
// answer, matching this card's existing static-accordion interaction model
// rather than inventing a chat modality this app has never had. Calls this
// system's own /ask proxy route (thin forward to Data Studio), never an AI
// provider directly — v6 never generates an answer itself.
//
// Two outcomes: a grounded answer with the facts it cites, or the
// NO_VERIFIED_ANSWER message plus recovery options (§6 of the master spec)
// built from whatever the ask route actually found — each button only
// appears when its URL is real, per the spec's own "only show if available"
// rule. The gap-logged note (§7) says a knowledge gap was recorded, never
// that the AI was "trained" on this question.

import { useState } from 'react'
import styles from './RevealsBody.module.css'

type AskResponse = {
  status: 'ANSWERED' | 'NO_VERIFIED_ANSWER'
  answer: { text: string; citedFacts?: string[] } | null
  message: string | null
  recovery?: {
    rewordHint?: boolean
    systemCardUrl?: string | null
    installGuideUrl?: string
    techDataUrl?: string
    contactManufacturer?: { name: string; url: string }
  }
  gapId?: string | null
  gapLoggedMessage?: string | null
}

export function AskAboutProductReveal({ manufacturerSlug, systemSlug }: {
  manufacturerSlug: string
  systemSlug: string
}) {
  const [question, setQuestion] = useState('')
  const [state, setState] = useState<'idle' | 'asking' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<AskResponse | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || state === 'asking') return
    setState('asking')
    setResult(null)
    try {
      const res = await fetch(`/api/library/${manufacturerSlug}/${systemSlug}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = (await res.json()) as AskResponse
      setResult(data)
      setState('done')
    } catch {
      setState('error')
    }
  }

  function askAnother() {
    setQuestion('')
    setResult(null)
    setState('idle')
  }

  return (
    <div className={styles.specGroup}>
      <p className={styles.specGroupLabel}>Ask about this product</p>

      {state !== 'done' && (
        <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Can this be used behind tiles in a shower?"
            disabled={state === 'asking'}
            style={{
              flex: 1, minWidth: 200, padding: '0.6rem 0.8rem', borderRadius: 8,
              border: '1.5px solid var(--color-border, #d1d5db)', fontSize: '0.9rem',
            }}
          />
          <button
            type="submit"
            disabled={state === 'asking' || !question.trim()}
            style={{
              padding: '0.6rem 1.1rem', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.88rem',
              background: '#185D7A', color: '#fff', cursor: state === 'asking' ? 'not-allowed' : 'pointer',
              opacity: state === 'asking' ? 0.6 : 1,
            }}
          >
            {state === 'asking' ? 'Asking…' : 'Ask'}
          </button>
        </form>
      )}

      {state === 'error' && (
        <p className={styles.descriptionText} style={{ marginTop: '0.6rem' }}>
          Couldn&apos;t reach the AI right now — please try again in a moment.
        </p>
      )}

      {state === 'done' && result && (
        <div style={{ marginTop: '0.4rem' }}>
          {result.status === 'ANSWERED' && result.answer ? (
            <>
              <p className={styles.descriptionText}>{result.answer.text}</p>
              {result.answer.citedFacts && result.answer.citedFacts.length > 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-faint, #9ca3af)', marginTop: '0.4rem' }}>
                  Based on: {result.answer.citedFacts.join(', ')}
                </p>
              )}
            </>
          ) : (
            <>
              <p className={styles.descriptionText}>
                {result.message ?? 'I can’t give you a definitive answer to that from the verified information currently available for this product.'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                {result.recovery?.rewordHint && (
                  <RecoveryButton label="Try another wording" onClick={askAnother} />
                )}
                {result.recovery?.systemCardUrl && (
                  <RecoveryLink label="View System Card" href={result.recovery.systemCardUrl} />
                )}
                {result.recovery?.installGuideUrl && (
                  <RecoveryLink label="View Installation Guide" href={result.recovery.installGuideUrl} external />
                )}
                {result.recovery?.techDataUrl && (
                  <RecoveryLink label="View Datasheet" href={result.recovery.techDataUrl} external />
                )}
                {result.recovery?.contactManufacturer && (
                  <RecoveryLink
                    label={`Contact ${result.recovery.contactManufacturer.name}`}
                    href={result.recovery.contactManufacturer.url}
                    external
                  />
                )}
              </div>
              {result.gapLoggedMessage && (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #6b7280)', marginTop: '0.7rem', lineHeight: 1.5 }}>
                  {result.gapLoggedMessage}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RecoveryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.4rem 0.8rem', borderRadius: 20, border: '1.5px solid #185D7A', background: '#fff',
        color: '#185D7A', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function RecoveryLink({ label, href, external }: { label: string; href: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      style={{
        padding: '0.4rem 0.8rem', borderRadius: 20, border: '1.5px solid #d1d5db', background: '#fff',
        color: '#374151', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', display: 'inline-block',
      }}
    >
      {label}
    </a>
  )
}
