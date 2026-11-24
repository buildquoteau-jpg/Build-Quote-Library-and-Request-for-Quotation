'use client'

import { useState } from 'react'

interface DeckerRfqCompanionProps {
  step: 2 | 3 | 4 | 5
  userName?: string
  siteAddress?: string
  itemCount: number
  fromDecksWa: boolean
}

type Msg = { role: 'user' | 'assistant'; text: string }

const QUICK_CHIPS = [
  'How much wastage should I allow?',
  'Delivery vs pickup for 5.4m boards?',
  'Do I need 316 stainless fixings?',
  'Do I need a login to send this?',
]

function localFallbackAnswer(q: string): string {
  const lower = q.toLowerCase()
  if (/wast|extra|spare|cut/.test(lower)) {
    return 'Allow 10% wastage for a standard rectangular deck, or 15% if you have an L-shape, diagonal layout, or picture-frame border. Always double-check board stock lengths (e.g. 5.4m) with your supplier.'
  }
  if (/deliver|pickup|hiab|crane|truck|5\.4/.test(lower)) {
    return 'Most composite and hardwood boards are 4.8m–5.4m long, so crane/Hiab flatbed delivery is usually easiest unless you have a long trailer or roof racks. Pop any narrow gate or steep driveway notes in Site Access so the yard quotes the right truck.'
  }
  if (/316|stainless|screw|clip|coast|salt|pool/.test(lower)) {
    return 'Within a few kilometres of the WA coast or around a saltwater pool, always specify Grade 316 marine stainless steel screws and clips — standard zinc or 304 stainless will tea-stain or corrode quickly in WA salt air.'
  }
  if (/login|account|sign|free|cost/.test(lower)) {
    return 'No login or trade account is required! You can send this Request for Quotation straight to your chosen WA supplier right now — just enter your email so you receive a copy and their pricing reply.'
  }
  return "Good question! Review your SKUs and quantities here, then pick a local WA timber or hardware stockist on the next step — your supplier will confirm live pricing, stock availability, and delivery timing."
}

export default function DeckerRfqCompanion({
  step,
  userName,
  siteAddress,
  itemCount,
  fromDecksWa,
}: DeckerRfqCompanionProps) {
  const [askOpen, setAskOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])

  const greeting = userName?.trim() ? `G'day ${userName.trim()}!` : "G'day!"
  const siteBit = siteAddress?.trim() ? ` for ${siteAddress.trim()}` : ''

  const stepHeadline =
    step === 2
      ? itemCount > 0
        ? `${greeting} I've carried ${itemCount} item${itemCount === 1 ? '' : 's'}${siteBit} over from your System Card.`
        : `${greeting} Add or review your decking materials below before picking a WA stockist.`
      : step === 4
        ? `${greeting} Almost there — choose your WA supplier${siteBit} and hit Send.`
        : `${greeting} Ripper — your quote request is on its way!`

  const stepTip =
    step === 2
      ? 'Check your lineal metres (usually +10% wastage) and confirm clips/screws match timber or metal joists before continuing.'
      : step === 4
        ? 'No login needed. Add any gate width or crane/Hiab delivery notes for 5.4m boards so suppliers price freight accurately.'
        : 'Download the PDF or CSV below for your records, or hop back to Decks WA to compare another decking system.'

  async function askDecker(question: string) {
    const clean = question.trim()
    if (!clean || busy) return
    setInput('')
    setAskOpen(true)
    const nextHistory: Msg[] = [...messages, { role: 'user', text: clean }]
    setMessages(nextHistory)
    setBusy(true)

    try {
      const res = await fetch('https://decks-wa.vercel.app/api/decker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'diy',
          userName: userName?.trim() || undefined,
          messages: nextHistory.slice(-6).map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      })
      if (!res.ok) throw new Error('offline')
      const data = (await res.json()) as { text?: string }
      const answer = data?.text?.trim() || localFallbackAnswer(clean)
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: localFallbackAnswer(clean) }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-[#142834]/15 bg-gradient-to-br from-[#10202b] via-[#142834] to-[#1f3b4a] text-white shadow-md">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <div className="flex items-start gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/decker/decker-face.webp"
            alt="Decker"
            className="h-12 w-12 shrink-0 rounded-full border-2 border-[#d9e2cf]/70 object-cover shadow-sm"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#d9e2cf]">
                Decker · Your WA Quoting Guide
              </span>
              {fromDecksWa && (
                <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                  Synced from Decks WA
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm font-bold leading-snug text-white sm:text-[15px]">
              {stepHeadline}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/80">
              {stepTip}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-15 sm:pl-0">
          <button
            type="button"
            onClick={() => setAskOpen((o) => !o)}
            className="rounded-lg border border-white/30 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/20"
          >
            {askOpen ? 'Hide Decker chat' : 'Ask Decker'}
          </button>
        </div>
      </div>

      {askOpen && (
        <div className="border-t border-white/15 bg-[#0d1c26]/80 px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={busy}
                onClick={() => void askDecker(chip)}
                className="rounded-full border border-[#d9e2cf]/30 bg-white/10 px-3 py-1 text-[11.5px] font-semibold text-[#d9e2cf] transition hover:bg-white/20 hover:text-white disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {messages.length > 0 && (
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-8 bg-[#b4532a] text-white'
                      : 'mr-6 border border-white/10 bg-white/10 text-white/95'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {busy && (
                <p className="text-[11px] font-medium text-[#d9e2cf]">Decker is checking…</p>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void askDecker(input)
            }}
            className="mt-3 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Decker about quantities, WA delivery, BAL ratings, or fixings…"
              className="min-w-0 flex-1 rounded-lg border border-white/25 bg-white px-3 py-2 text-xs text-[#142834] placeholder:text-slate-400 focus:border-[#b4532a] focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-[#b4532a] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#9c4522] disabled:opacity-50"
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
