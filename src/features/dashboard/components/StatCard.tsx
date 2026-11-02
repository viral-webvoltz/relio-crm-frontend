import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tones = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
}

type StatCardProps = { label: string; value: string; hint?: string; icon: LucideIcon; tone: keyof typeof tones; /** Opens the list this number comes from. */ to?: string; /** Change vs the previous period. */ delta?: ReactNode }

export function StatCard({ label, value, hint, icon: Icon, tone, to, delta }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className={cn('flex size-10 items-center justify-center rounded-full', tones[tone])}>
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-medium text-heading">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-heading">{value}</p>
      {(delta || hint) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          {delta}
          {hint}
        </p>
      )}
    </>
  )
  return to ? (
    <Link to={to} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-md">{body}</Link>
  ) : (
    <div className="card p-5">{body}</div>
  )
}
