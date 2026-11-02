import { Ban, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { keyStatus, type ApiKey, type ApiKeyStatus } from '../types'

const view: Record<ApiKeyStatus, { label: string; icon: typeof Ban; tone: string }> = {
  active: { label: 'Active', icon: CheckCircle2, tone: 'bg-success/10 text-success ring-success/20' },
  expired: { label: 'Expired', icon: Clock, tone: 'bg-warning/10 text-warning ring-warning/20' },
  revoked: { label: 'Revoked', icon: Ban, tone: 'bg-destructive/10 text-destructive ring-destructive/20' },
}

// Icon and word together, so the state never depends on colour.
export function KeyStatus({ apiKey }: { apiKey: Pick<ApiKey, 'revokedAt' | 'expiresAt'> }) {
  const { label, icon: Icon, tone } = view[keyStatus(apiKey)]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', tone)}>
      <Icon className="size-3.5" aria-hidden /> {label}
    </span>
  )
}
