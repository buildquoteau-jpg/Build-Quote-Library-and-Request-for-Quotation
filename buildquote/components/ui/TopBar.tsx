'use client'

interface TopBarProps {
  currentStep: 2 | 3 | 4 | 5
  onStepClick?: (step: number) => void
  fromDecksWa?: boolean
}

const steps = [
  { n: 2, label: 'Items' },
  { n: 4, label: 'Details' },
  { n: 5, label: 'Done' },
]

export default function TopBar({ currentStep, onStepClick, fromDecksWa = false }: TopBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-[#10202b] via-[#142834] to-[#1f3b4a] border-b border-white/10 px-3 sm:px-5 py-2.5 sm:py-3 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {fromDecksWa && (
            <a
              href="https://decks-wa.vercel.app/decking"
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-[#d9e2cf] hover:bg-white/20 hover:text-white transition-colors whitespace-nowrap"
            >
              ← Decks WA
            </a>
          )}
          <a href="/" className="flex flex-col shrink-0">
            <span className="font-bold text-base sm:text-lg tracking-tight leading-tight">
              <span className="text-white">Build</span>
              <span className="text-[#e07a47]">Quote</span>
            </span>
            <span className="text-[#d9e2cf]/85 text-[10px] sm:text-xs leading-tight font-medium hidden xs:block">
              {fromDecksWa ? 'Decks WA · Request for Quotation' : 'Request for Quotation, Made Simple'}
            </span>
          </a>
        </div>

        {/* Step indicators + Portal link */}
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="/dashboard"
            className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap mr-1"
          >
            Builder Portal
          </a>
          {steps.map(({ n, label }, idx) => {
            const isActive = n === currentStep
            const isDone = n < currentStep

            return (
              <div key={n} className="flex items-center gap-1 sm:gap-2">
                {idx > 0 && (
                  <div className={`w-3 sm:w-5 h-px ${isDone || isActive ? 'bg-[#d9e2cf]/60' : 'bg-white/20'}`} />
                )}
                <button
                  type="button"
                  onClick={() => !isActive && onStepClick?.(n)}
                  disabled={isActive}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#b4532a] text-white shadow-sm'
                      : isDone
                      ? 'bg-[#d9e2cf]/20 text-[#d9e2cf] cursor-pointer hover:bg-[#d9e2cf]/30'
                      : 'bg-white/10 text-white/55 cursor-default'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : isDone ? 'text-[#d9e2cf]' : 'text-white/55'
                  }`}>
                    {isDone ? '✓' : idx + 1}
                  </span>
                  <span>{label}</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
