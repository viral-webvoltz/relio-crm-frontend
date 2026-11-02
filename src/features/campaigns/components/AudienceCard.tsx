import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAudience } from '../hooks/useCampaigns'
import { MAX_RECIPIENTS } from '../types'

// Who would get the campaign if it were sent right now (nothing is sent or stored by looking).
export function AudienceCard({ campaignId, note }: { campaignId: string; note?: string }) {
  const audience = useAudience(campaignId)
  return (
    <section className="card p-5" aria-labelledby="audience-heading">
      <div className="flex items-start justify-between gap-3">
        <h2 id="audience-heading" className="text-base font-semibold text-heading">Who will receive it</h2>
        <button type="button" aria-label="Recount the audience" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-background" onClick={() => audience.refetch()}>
          <RefreshCw className={cn('size-4', audience.isFetching && 'animate-spin')} aria-hidden />
        </button>
      </div>
      {audience.isPending ? (
        <p className="mt-2 text-sm text-muted">Counting…</p>
      ) : audience.isError ? (
        <p role="alert" className="mt-2 text-sm text-destructive">{audience.error.message}</p>
      ) : (
        <div aria-live="polite">
          <p className="mt-2 text-2xl font-semibold text-heading">{audience.data.willReceive.toLocaleString()}</p>
          <p className="text-sm text-body">{audience.data.willReceive === 1 ? 'person' : 'people'} would get this email.</p>
          {audience.data.skipped > 0 && <p className="mt-2 text-xs text-muted">{audience.data.skipped.toLocaleString()} more match but are left out (no email address, or they unsubscribed).</p>}
          {audience.data.tooLarge && <p role="alert" className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">That is more than {MAX_RECIPIENTS.toLocaleString()} people. Narrow the audience to send it.</p>}
          {audience.data.willReceive === 0 && !audience.data.tooLarge && <p className="mt-2 text-sm text-muted">Nobody can receive it yet. Pick a different audience.</p>}
          {audience.data.sample.length > 0 && (
            <ul className="mt-3 space-y-0.5 text-xs text-muted">
              {audience.data.sample.map((p) => (
                <li key={p.email}>{p.name} · {p.email}</li>
              ))}
              {audience.data.willReceive > audience.data.sample.length && <li>…and more</li>}
            </ul>
          )}
        </div>
      )}
      {note && <p className="mt-3 text-xs text-muted">{note}</p>}
    </section>
  )
}
