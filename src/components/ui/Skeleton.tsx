import type { LucideIcon } from 'lucide-react'
import { Inbox, RotateCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Pulsing placeholder rows; stays out of the accessibility tree except for one status label.
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-border/60">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4" aria-hidden>
          <span className="size-9 shrink-0 rounded-full bg-border" />
          <span className="h-3 w-1/4 rounded-full bg-border" />
          <span className="hidden h-3 w-1/5 rounded-full bg-border/70 sm:block" />
          <span className="ml-auto h-3 w-16 rounded-full bg-border/70" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="card" role="status" aria-live="polite">
      <h1 className="sr-only">Loading…</h1>
      <TableSkeleton />
    </div>
  )
}

export function EmptyState({ title, hint, icon: Icon = Inbox }: { title: string; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="mt-4 font-semibold text-heading">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-muted">{hint}</p>}
    </div>
  )
}

// Friendly failure block with a retry; `message` must already be user-readable.
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <p className="mt-4 font-semibold text-heading">Something went wrong</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="ghost" className="mt-4" onClick={onRetry}>
          <RotateCw className="size-4" aria-hidden /> Try again
        </Button>
      )}
    </div>
  )
}
