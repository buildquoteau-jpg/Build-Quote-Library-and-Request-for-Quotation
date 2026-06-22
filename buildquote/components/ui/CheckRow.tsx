interface CheckRowProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function CheckRow({ label, checked, onChange }: CheckRowProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-brand bg-brand' : 'border-border bg-white'}`}>
        {checked && (
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-text-secondary text-sm">{label}</span>
    </label>
  )
}
