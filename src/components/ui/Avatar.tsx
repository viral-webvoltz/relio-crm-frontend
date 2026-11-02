import { cn } from '@/lib/utils'

const palettes = ['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700']

// Initials on a colour picked from the name, so the same person always looks the same.
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'
  const hue = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % palettes.length
  return (
    <span aria-hidden className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold', palettes[hue], className)}>
      {initials}
    </span>
  )
}
