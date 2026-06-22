interface ToggleProps {
  value: 'delivery' | 'pickup'
  onChange: (value: 'delivery' | 'pickup') => void
}
export default function Toggle({ value, onChange }: ToggleProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-border-subtle w-fit">
      {(['delivery', 'pickup'] as const).map(option => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
            value === option
              ? 'bg-brand text-white'
              : 'bg-ui text-text-muted hover:bg-ui-hover'
          }`}
        >
          {option === 'delivery' ? 'Delivery' : 'Store Pick-up'}
        </button>
      ))}
    </div>
  )
}
