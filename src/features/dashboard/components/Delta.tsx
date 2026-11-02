import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

// Change vs the previous period. Direction is spelled out in text and an icon, never colour alone.
export function Delta({ value, previous, points }: { value: number; previous: number; /** Compare in percentage points (for rates). */ points?: boolean }) {
  const diff = value - previous
  let text: string
  if (diff === 0) text = 'No change'
  else if (points) text = `${Math.abs(Math.round(diff * 10) / 10)} pts`
  else if (previous === 0) text = 'New'
  else text = `${Math.abs(Math.round((diff / previous) * 100))}%`
  const Icon = diff === 0 ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted')}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{diff > 0 ? 'Up' : diff < 0 ? 'Down' : ''}</span>
      {text}
    </span>
  )
}
