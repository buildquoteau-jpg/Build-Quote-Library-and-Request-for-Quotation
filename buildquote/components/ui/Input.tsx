interface InputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  className?: string
}

export default function Input({ label, value, onChange, placeholder, type = 'text', className = '' }: InputProps) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <label className="text-xs text-text-secondary font-semibold uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors w-full max-w-full box-border text-sm"
      />
    </div>
  )
}
