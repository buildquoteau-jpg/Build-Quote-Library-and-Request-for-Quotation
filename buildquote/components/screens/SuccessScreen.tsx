'use client'
import { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import SectionLabel from '../ui/SectionLabel'
import { RFQPayload } from '@/lib/types'

interface SuccessScreenProps {
  rfqId: string
  payload: RFQPayload
  onReset: () => void
}

export default function SuccessScreen({ rfqId, payload, onReset }: SuccessScreenProps) {
  const download = async (type: 'pdf' | 'csv') => {
    const res = await fetch(`/api/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${rfqId}.${type}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)

  const handleCommunitySignup = async () => {
    if (!payload.builder.email || joined || joining) return
    setJoining(true)
    try {
      await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.builder.email, rfqId }),
      })
      setJoined(true)
    } catch {
      // fail silently
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="w-full px-4 py-4 sm:py-5">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-center shadow-sm">
          <div className="text-3xl leading-none sm:text-4xl">✅</div>

          <h1 className="mt-2 text-2xl font-bold leading-tight text-text-primary sm:text-3xl">
            RFQ Sent
          </h1>

          <p className="mx-auto mt-1 max-w-sm text-sm font-medium leading-relaxed text-text-secondary">
            Your quote request has been sent to {payload.supplier.supplierName}.
          </p>

          <div className="mt-4 rounded-xl bg-surface-subtle px-4 py-3 text-left">
            <SectionLabel>RFQ Reference</SectionLabel>
            <p className="mt-1 break-all font-mono text-lg font-bold tracking-tight text-brand sm:text-xl">
              {rfqId}
            </p>
          </div>
        </div>

        <Card className="w-full py-3">
          <SectionLabel>Downloads</SectionLabel>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => download('pdf')}
              className="w-full py-2.5"
            >
              ⬇ PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() => download('csv')}
              className="w-full py-2.5"
            >
              ⬇ CSV
            </Button>
          </div>
        </Card>

        <Button
          onClick={onReset}
          className="w-full py-2.5 text-white"
        >
          + Start Another RFQ
        </Button>

        <div className="flex w-full gap-2 rounded-xl border border-border bg-ui-darker p-3 text-left">
          <span className="mt-0.5 shrink-0 text-sm text-warning">⚠</span>
          <p className="text-sm font-medium leading-relaxed text-text-secondary">
            BuildQuote does not track builder to supplier requests for quotation. Please contact your preferred supplier to confirm receipt and product availability.
          </p>
        </div>

        <div className="w-full rounded-xl p-[1.5px] bq-flow-border">
          <div className="rounded-[11px] bg-white p-3 text-left">
            <p className="text-sm font-semibold text-text-primary sm:text-base">
              More features coming to BuildQuote soon.
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-text-secondary">
              Supplier directory, saved builder profiles, component libraries and more — built for Southwest WA builders.
            </p>

            <div className="mt-3">
              {joined ? (
                <p className="text-sm font-semibold text-brand">
                  ✓ You&apos;re in — we&apos;ll keep you posted.
                </p>
              ) : (
                <label className="bq-community-cta flex cursor-pointer items-center gap-3 rounded-xl border border-brand/30 bg-white px-4 py-3 transition hover:scale-[1.01]">
                  <input
                    type="checkbox"
                    checked={joined}
                    onChange={handleCommunitySignup}
                    disabled={joining || !payload.builder.email}
                    className="h-6 w-6 shrink-0 accent-brand"
                  />
                  <span className="text-base font-bold text-text-primary leading-snug">
                    {joining ? 'Signing you up...' : 'Join the BuildQuote community'}
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
