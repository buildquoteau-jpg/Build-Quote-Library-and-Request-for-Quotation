interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 overflow-hidden border border-[#e3dfd6] shadow-[0_2px_12px_rgba(20,40,52,0.05)] ${className}`} {...props}>
      {children}
    </div>
  )
}
