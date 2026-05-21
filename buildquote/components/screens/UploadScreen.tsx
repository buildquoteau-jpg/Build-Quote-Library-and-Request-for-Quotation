'use client'
import { useState, useRef, useEffect } from 'react'
import { getOrCreateDraft } from '@/lib/rfqDraft'
import Button from '../ui/Button'
import { LineItem } from '@/lib/types'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface UploadScreenProps {
  onNext: (items: LineItem[]) => void
  onSkip: () => void
}

const LOADING_MESSAGES = [
  'Reading your list...',
  'Identifying the items...',
  'Organising your lines...',
  'Checking quantities...',
  'Almost done...',
  'Nearly there...',
]

export default function UploadScreen({ onNext, onSkip }: UploadScreenProps) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msgIndex, setMsgIndex] = useState(0)
  const [builderName, setBuilderName] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const MAX_FILES = 5

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('builders')
          .select('builder_name, company_name')
          .eq('id', user.id)
          .single()
        setBuilderName(profile?.builder_name || profile?.company_name || user.email || 'Builder')
      }
      setAuthChecked(true)
    })
  }, [])

  useEffect(() => {
    if (loading) {
      setMsgIndex(0)
      intervalRef.current = setInterval(() => {
        setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
      }, 2800)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loading])

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return

    const newFiles = Array.from(incoming)

    setFiles(prev => {
      const combined = [...prev, ...newFiles]
      if (combined.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files at once.`)
        return prev
      }
      setError('')
      return combined
    })
  }

  const removeFile = (i: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
    setError('')
  }

  const handleParse = async () => {
    if (files.length === 0) return

    setLoading(true)
    setError('')

    try {
      const draftId = await getOrCreateDraft()
      const allItems: LineItem[] = []

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/parse', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.error || 'Parse failed')
        }

        if (data.items) allItems.push(...data.items)
      if (allItems.length === 0) {
        throw new Error('We couldn\'t find any items in your file. Tips: make sure your list is clearly written, one item per line, with quantities if possible. Photos work best in good lighting with clear handwriting.')
      }
      }

      if (allItems.length === 0) {
        throw new Error('We could not find any items in your file. Tips: make sure your list is clearly written with one item per line. Photos work best in good lighting with clear handwriting.')
      }
      if (allItems.length > 0) {
        const saveRes = await fetch('/api/save-draft-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftId, items: allItems }),
        })

        const saveData = await saveRes.json().catch(() => ({}))

        if (!saveRes.ok) {
          throw new Error(saveData?.error || 'Failed to save draft items')
        }
      }

      onNext(allItems)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong reading your file. Try a clearer photo or a different file format (PDF, CSV, or image).')
    } finally {
      setLoading(false)
    }
  }

  const handleBrowseManufacturerComponents = async () => {
    try {
      setError('')
      const draft = await getOrCreateDraft()
      const url = 'https://mfp.buildquote.com.au/manufacturers?draft=' + draft
      window.open(url, '_blank')
    } catch (err: any) {
      setError(err?.message || 'Could not open Manufacturer Portal.')
    }
  }

  const hasFiles = files.length > 0

  const baseCardClass =
    'group rounded-2xl border-2 bg-white p-4 sm:p-5 text-left transition-all duration-200 shadow-[0_8px_20px_rgba(24,93,122,0.06)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(24,93,122,0.10)] focus:outline-none focus:ring-2 focus:ring-[rgba(24,93,122,0.18)]'

  const iconClass =
    'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[rgba(24,93,122,0.16)] bg-[rgba(24,93,122,0.03)] text-heading text-xl font-bold shadow-[0_6px_14px_rgba(24,93,122,0.06)]'

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-heading text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
          Create your quote request
        </h2>
        <p className="text-text-secondary text-sm sm:text-lg mt-2 sm:mt-3 font-semibold leading-relaxed">
          Choose how to add your materials — the best way for you
        </p>
      </div>

      {authChecked && (
        builderName ? (
          <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-4 bg-[rgba(24,93,122,0.06)] border border-[rgba(24,93,122,0.18)] rounded-2xl px-5 py-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <p className="text-sm font-semibold text-heading truncate">
                G'day, {builderName?.split(' ')[0] || builderName} — your details will auto-fill at request for quotation.
              </p>
            </div>
            <a href="/dashboard" className="shrink-0 text-xs font-bold text-[#185D7A] border border-[rgba(24,93,122,0.3)] rounded-xl px-3 py-1.5 hover:bg-[rgba(24,93,122,0.08)] transition whitespace-nowrap">
              Dashboard
            </a>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-4 bg-surface border border-border-subtle rounded-2xl px-5 py-3.5">
            <p className="text-sm font-semibold text-text-secondary">
              Builder account? Sign in to auto-fill your details.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <a href="/login?next=/rfq" className="text-xs font-bold text-white bg-[#185D7A] rounded-xl px-4 py-1.5 hover:opacity-90 transition whitespace-nowrap">
                Sign in
              </a>
              <span className="text-xs text-text-muted font-medium whitespace-nowrap hidden sm:block">or continue below</span>
            </div>
          </div>
        )
      )}

      {error && (
        <div className="rounded-2xl border-2 border-error-border bg-error-bg px-4 py-3">
          <p className="text-error text-sm font-semibold">{error}</p>
        </div>
      )}

      <div className="grid gap-6 max-w-5xl mx-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div className={`${baseCardClass} border-heading/30 bg-[rgba(24,93,122,0.02)]  shadow-[0_10px_24px_rgba(24,93,122,0.12)] hover:border-heading`}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              addFiles(e.dataTransfer.files)
            }}
            className="block w-full text-left"
          >
            <div className="mb-1.5">
              <div className="text-[10px] tracking-[0.2em] font-semibold text-[var(--color-accent)]">OPTION 1</div>
            </div>

            <h3 className="text-heading text-xl font-extrabold tracking-tight leading-tight">
              Upload a materials list
            </h3>

            
<img src="/rfq/handwritten-roof-note.jpeg" alt="Example handwritten materials list" className="mt-4 mb-2 sm:mt-6 sm:mb-3 block w-[calc(100%+2rem)] -mx-4 h-44 sm:h-56 object-cover rounded-none shadow-none" />

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs font-bold text-heading bg-[rgba(24,93,122,0.08)] px-2.5 py-1 rounded-full">Handwritten list</span>
              <span className="text-xs font-bold text-heading bg-[rgba(24,93,122,0.08)] px-2.5 py-1 rounded-full">PDF / BOM</span>
              <span className="text-xs font-bold text-heading bg-[rgba(24,93,122,0.08)] px-2.5 py-1 rounded-full">Takeoff CSV</span>
            </div>

            <p className="text-text-muted text-sm mt-2 font-medium leading-relaxed">
              Photos, PDFs, CSVs — we'll sort it out.
            </p>
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />

          {hasFiles && (
            <div className="mt-4 flex flex-col gap-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border-2 border-border bg-surface-subtle px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-text-primary text-sm font-semibold truncate">{f.name}</p>
                    <p className="text-text-muted text-xs mt-0.5 font-medium">
                      {(f.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="ml-3 shrink-0 rounded-lg px-2 py-1 text-text-muted hover:text-error text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <Button onClick={handleParse} disabled={loading} className="w-full py-3 text-sm mt-1 !text-white animate-pulse">
                {loading ? 'Reading your list...' : 'Read my list'}
              </Button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onSkip}
          className={`${baseCardClass} border-border hover:border-heading`}
        >

          <div className="text-[10px] tracking-[0.2em] font-semibold text-[var(--color-accent)] mb-1.5">OPTION 2</div>
<h3 className="text-heading text-xl font-extrabold tracking-tight leading-tight ">
            Add items manually
          </h3>

          <div className="mt-3 mb-3 sm:mt-5 sm:mb-4 rounded-xl border border-border bg-surface-subtle p-3 pointer-events-none">
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary overflow-hidden whitespace-nowrap">
                <span className="bq-typing-line1">Reinforcing mesh</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary overflow-hidden whitespace-nowrap">
                  <span className="bq-typing-line2">SL82 2.4 x 6m</span>
                </div>
                <div className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-muted overflow-hidden whitespace-nowrap">
                  <span className="bq-typing-line3">Qty: 12</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-text-secondary text-sm font-semibold leading-relaxed">
            Type what you need while you're still on site.
          </p>

          <p className="text-text-muted text-sm mt-2 font-medium leading-relaxed">
            No file? No worries.
          </p>
        </button>
        {/* Option 3 — Browse manufacturer portal */}
        <button
          type="button"
          onClick={handleBrowseManufacturerComponents}
          className={`${baseCardClass} border-border hover:border-heading`}
        >
          <div className="text-[10px] tracking-[0.2em] font-semibold text-[var(--color-accent)] mb-1.5">OPTION 3</div>
          <h3 className="text-heading text-xl font-extrabold tracking-tight leading-tight">
            Browse manufacturer systems
          </h3>

          {/* Mini card grid preview */}
          <div className="mt-3 mb-3 sm:mt-5 sm:mb-4 rounded-xl border border-border bg-surface-subtle p-3 pointer-events-none">
            <div className="grid grid-cols-2 gap-2">
              {[
                { cat: 'Cladding',  bg: '#dbeafe', tc: '#1e40af', label: 'Weathertex' },
                { cat: 'Decking',   bg: '#d1fae5', tc: '#065f46', label: 'NewTechWood' },
                { cat: 'Lining',    bg: '#ede9fe', tc: '#5b21b6', label: 'James Hardie' },
                { cat: 'Flooring',  bg: '#d1fae5', tc: '#065f46', label: 'BGC' },
              ].map((c) => (
                <div
                  key={c.label}
                  className="rounded-lg border border-border bg-white p-2"
                >
                  <span
                    className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1"
                    style={{ background: c.bg, color: c.tc }}
                  >
                    {c.cat}
                  </span>
                  <div className="text-[11px] font-semibold text-text-primary leading-tight truncate">
                    {c.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-text-secondary text-sm font-semibold leading-relaxed">
            Browse systems from leading AU manufacturers.
          </p>

          <p className="text-text-muted text-sm mt-2 font-medium leading-relaxed">
            Select components and add directly to your quote.
          </p>
        </button>
      </div>

      <style jsx global>{`
        .bq-note-demo {
          position: relative;
        }

        .bq-note-line {
          display: inline-block;
          font-family: "Comic Sans MS", "Bradley Hand", "Marker Felt", cursive;
          font-weight: 700;
          letter-spacing: 0.01em;
          transform: rotate(-1.2deg);
          transform-origin: left center;
          animation: bqHandLine 3.6s ease-in-out infinite;
        }

        .bq-camera {
          animation: bqCameraPulse 3.6s ease-in-out infinite;
        }

        .bq-flash {
          background:
            radial-gradient(circle at 84% 20%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.72) 12%, rgba(255,255,255,0.18) 24%, rgba(255,255,255,0) 42%);
          opacity: 0;
          animation: bqCameraFlash 3.6s ease-in-out infinite;
        }

        @keyframes bqHandLine {
          0% { opacity: 0.82; transform: rotate(-1.2deg) translateY(0px); }
          18% { opacity: 1; transform: rotate(-1.2deg) translateY(0px); }
          50% { opacity: 1; transform: rotate(-1.2deg) translateY(0px); }
          62% { opacity: 1; transform: rotate(-1.2deg) translateY(-0.5px); }
          100% { opacity: 0.82; transform: rotate(-1.2deg) translateY(0px); }
        }

        @keyframes bqCameraPulse {
          0% { transform: scale(1); }
          52% { transform: scale(1); }
          58% { transform: scale(0.92); }
          66% { transform: scale(1); }
          100% { transform: scale(1); }
        }

        .bq-typing-line1, .bq-typing-line2, .bq-typing-line3 {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid var(--color-navy);
          animation: bqTyping 2.4s steps(20, end) infinite alternate, bqBlink 0.6s step-end infinite;
        }
        .bq-typing-line1 {
          max-width: 0;
          animation: bqTypeIn 5s ease-out 0s infinite;
        }
        .bq-typing-line2 {
          max-width: 0;
          animation: bqTypeIn 5s ease-out 2.2s infinite;
        }
        .bq-typing-line3 {
          max-width: 0;
          animation: bqTypeIn 5s ease-out 3.8s infinite;
        }

        @keyframes bqTypeIn {
          0% { max-width: 0; border-right-color: var(--color-navy); }
          40% { max-width: 200px; border-right-color: var(--color-navy); }
          60% { max-width: 200px; border-right-color: var(--color-navy); }
          80% { max-width: 200px; border-right-color: transparent; }
          100% { max-width: 200px; border-right-color: transparent; }
        }

        @keyframes bqBlink {
          50% { border-right-color: transparent; }
        }

        @keyframes bqCameraFlash {
          0% { opacity: 0; }
          54% { opacity: 0; }
          60% { opacity: 0.95; }
          68% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>

      {loading && (
        <div className="fixed inset-0 bg-[rgba(255,255,255,0.92)] backdrop-blur-[2px] flex items-center justify-center z-50">
          <div className="w-full max-w-sm rounded-2xl border-2 border-border bg-white px-6 py-8 text-center shadow-[0_18px_40px_rgba(24,93,122,0.16)]">
            <div className="w-12 h-12 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
            <p className="text-heading font-bold text-lg tracking-tight" key={msgIndex}>
              {LOADING_MESSAGES[msgIndex]}
            </p>
            <p className="text-text-secondary text-sm mt-3 font-medium">
              This usually takes 15–30 seconds
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
