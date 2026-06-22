interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}

export default function Button({ children, onClick, variant = 'primary', disabled, type = 'button', className = '' }: ButtonProps) {
  const styles = {
    primary: 'bg-brand hover:bg-brand-hover text-white',
    secondary: 'bg-ui hover:bg-ui-hover text-text-primary',
    success: 'bg-success hover:bg-success text-white',
    ghost: 'bg-transparent hover:bg-ui text-text-secondary border border-border-subtle',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
