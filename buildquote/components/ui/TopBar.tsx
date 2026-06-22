'use client'

interface TopBarProps {
  currentStep: 2 | 3 | 4 | 5
  onStepClick?: (step: number) => void
}

const steps = [
  { n: 2, label: 'Items' },
  { n: 4, label: 'Details' },
  { n: 5, label: 'Done' },
]

export default function TopBar({ currentStep, onStepClick }: TopBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-ui-darker border-b border-border px-3 sm:px-4 py-2 sm:py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        <a href="/" className="flex flex-col shrink-0">
          <span className="font-bold text-base sm:text-lg tracking-tight leading-tight">
            <span className="text-heading">Build</span>
            <span className="text-brand">Quote</span>
          </span>
          <span className="text-text-secondary text-[10px] sm:text-xs leading-tight font-semibold hidden xs:block">
            Request for Quotation, Made Simple
          </span>
        </a>

        {/* Step indicators */}
        <div className="flex items-center gap-1 sm:gap-2">
          {steps.map(({ n, label }, idx) => {
            const isActive = n === currentStep
            const isDone = n < currentStep

            return (
              <div key={n} className="flex items-center gap-1 sm:gap-2">
                {idx > 0 && (
                  <div className={`w-4 sm:w-6 h-px ${isDone || isActive ? 'bg-brand/40' : 'bg-border'}`} />
                )}
                <button
                  type="button"
                  onClick={() => !isActive && onStepClick?.(n)}
                  disabled={isActive}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-brand text-white'
                      : isDone
                      ? 'bg-brand/15 text-brand cursor-pointer hover:bg-brand/25'
                      : 'bg-surface text-text-faint cursor-default'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : isDone ? 'text-brand' : 'text-text-faint'
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
