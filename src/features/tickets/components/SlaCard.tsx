import { format, parseISO } from 'date-fns'
import type { TicketSla } from '../types'
import { SlaBadge } from './TicketBadges'
import { dueText, liveState, useNow } from './slaTime'

function Clock({ title, dueAt, doneAt, state, pausedNote }: { title: string; dueAt: string; doneAt: string | null; state: Parameters<typeof SlaBadge>[0]['state']; pausedNote?: string }) {
  const now = useNow()
  const current = liveState(state, dueAt, now)
  const finished = current === 'met' || current === 'missed'
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <dt className="text-muted">{title}</dt>
        <dd><SlaBadge state={current} /></dd>
      </div>
      <p className="text-sm text-heading">
        Due {format(parseISO(dueAt), 'd MMM, HH:mm')}
        {current === 'paused' ? '' : finished ? '' : ` (${dueText(dueAt, now)})`}
      </p>
      {doneAt && <p className="text-xs text-muted">{title.startsWith('First') ? 'Answered' : 'Resolved'} {format(parseISO(doneAt), 'd MMM, HH:mm')}</p>}
      {current === 'paused' && pausedNote && <p className="text-xs text-muted">{pausedNote}</p>}
    </div>
  )
}

// The ticket's two clocks. Times count down on screen without re-fetching.
export function SlaCard({ sla }: { sla: TicketSla }) {
  const paused = 'The clock is paused while we wait for the customer.'
  return (
    <section aria-label="Response targets" className="space-y-4 border-t border-border/60 pt-4">
      <h2 className="text-sm font-semibold text-heading">Response targets</h2>
      <dl className="space-y-4 text-sm">
        {sla.firstResponse && <Clock title="First reply" dueAt={sla.firstResponse.dueAt} doneAt={sla.firstResponse.respondedAt} state={sla.firstResponse.state} pausedNote={paused} />}
        <Clock title="Resolution" dueAt={sla.resolution.dueAt} doneAt={sla.resolution.resolvedAt} state={sla.resolution.state} pausedNote={paused} />
      </dl>
    </section>
  )
}
