import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { CalendarDays, CheckSquare, CircleDot, FileText, Handshake, History, LifeBuoy, Mail, Phone, ShoppingCart, StickyNote, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import { useTimeline } from '../hooks/useTimeline'
import { timelinePermission, type TimelineEntity, type TimelineItem } from '../types'

export type TimelinePanelProps = {
  entity: TimelineEntity
  entityId: string
  /** Heading text; defaults to "Timeline". */
  title?: string
}

// Every item gets an icon AND a words label, so meaning never depends on colour or shape alone.
const kinds: Record<string, { label: string; icon: LucideIcon }> = {
  note: { label: 'Note added', icon: StickyNote },
  call: { label: 'Call logged', icon: Phone },
  meeting: { label: 'Meeting logged', icon: CalendarDays },
  email: { label: 'Email logged', icon: Mail },
  task: { label: 'Task created', icon: CheckSquare },
  deal: { label: 'Deal created', icon: Handshake },
  order: { label: 'Order placed', icon: ShoppingCart },
  invoice: { label: 'Invoice issued', icon: FileText },
  ticket: { label: 'Support ticket opened', icon: LifeBuoy },
}

// Unknown future types still read as a sentence: "invoice_reminder" → "Invoice reminder recorded".
const kindOf = (type: string) => kinds[type] ?? { label: `${type.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())} recorded`, icon: CircleDot }

// Only records that have their own page get a link.
const hrefFor = (item: TimelineItem) => (item.entityType === 'order' ? `/orders/${item.entityId}` : item.entityType === 'invoice' ? `/invoices/${item.entityId}` : item.entityType === 'ticket' ? `/support/${item.entityId}` : null)

const dayLabel = (iso: string) => {
  const date = parseISO(iso)
  return isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'EEEE, d MMMM yyyy')
}

function group(items: TimelineItem[]) {
  const days: { key: string; label: string; items: TimelineItem[] }[] = []
  for (const item of items) {
    const key = format(parseISO(item.at), 'yyyy-MM-dd')
    const last = days.at(-1)
    if (last?.key === key) last.items.push(item)
    else days.push({ key, label: dayLabel(item.at), items: [item] })
  }
  return days
}

// Read-only, newest-first story of everything that happened around a record. Renders nothing for users who may not view it.
export function TimelinePanel({ entity, entityId, title = 'Timeline' }: TimelinePanelProps) {
  const canView = useCan(timelinePermission[entity])
  const query = useTimeline(entity, entityId, canView)
  if (!canView) return null

  const items = query.data?.pages.flatMap((p) => p.data) ?? []
  const total = query.data?.pages.at(-1)?.meta.total ?? 0

  return (
    <section aria-labelledby={`timeline-title-${entityId}`} className="card space-y-4 p-6">
      <h2 id={`timeline-title-${entityId}`} className="flex items-center gap-2 text-base font-semibold text-heading">
        <History className="size-4 text-primary" aria-hidden /> {title}
      </h2>

      {query.isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading timeline">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-background" />)}
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={History} title="Nothing here yet" hint="Calls, notes, tasks, deals, orders, invoices and tickets for this contact will appear here, as far as your role can see them." />
      ) : (
        <>
          <div className="space-y-5">
            {group(items).map((day) => (
              <div key={day.key}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{day.label}</h3>
                <ol className="space-y-3 border-l border-border pl-4">
                  {day.items.map((item) => {
                    const { label, icon: Icon } = kindOf(item.type)
                    const href = hrefFor(item)
                    return (
                      <li key={`${item.entityType}-${item.entityId}-${item.at}`} className="relative">
                        <span className="absolute -left-[1.65rem] top-0.5 grid size-6 place-items-center rounded-full bg-primary-soft text-primary ring-4 ring-surface"><Icon className="size-3.5" aria-hidden /></span>
                        <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                          <span className="font-semibold text-heading">{label}</span>
                          <time dateTime={item.at} title={format(parseISO(item.at), 'EEEE d MMMM yyyy, HH:mm:ss')}>{format(parseISO(item.at), 'HH:mm')}</time>
                          {item.actorName && <span>· {item.actorName}</span>}
                        </div>
                        <p className="break-words text-sm text-heading">{href ? <Link to={href} className="text-primary hover:underline">{item.title}</Link> : item.title}</p>
                        {item.summary && <p className="break-words text-sm text-body">{item.summary}</p>}
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
          {query.hasNextPage && (
            <Button type="button" variant="ghost" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
              Show older ({total - items.length} more)
            </Button>
          )}
        </>
      )}
    </section>
  )
}
