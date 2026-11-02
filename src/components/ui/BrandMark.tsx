import { cn } from '@/lib/utils'

// Relio logo: a rounded tile with an "R" whose leg ends in a connected dot, for relationships.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" role="img" aria-label="Relio logo" className={cn('rounded-xl', className)}>
      <defs>
        <linearGradient id="relio-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2f6bff" />
          <stop offset="1" stopColor="#5b4bdb" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#relio-bg)" />
      <path d="M14 29V11h7.5a5.5 5.5 0 0 1 0 11H14m6.5 0 5.2 7" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="29" cy="29.5" r="2.6" fill="#a5f3fc" />
    </svg>
  )
}
