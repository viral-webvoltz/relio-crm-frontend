import { Select } from '@/components/ui/Select'
import { DocumentsPanel } from '@/features/documents/components/DocumentsPanel'
import { format, parseISO } from 'date-fns'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import { useUserOptions } from '@/features/users/hooks/useUsers'
import { SlaCard } from '../components/SlaCard'
import { TicketPriorityBadge, TicketStatusBadge } from '../components/TicketBadges'
import { CommentsPanel } from '@/features/comments/components/CommentsPanel'
import { TicketReplyForm } from '../components/TicketReplyForm'
import { TicketThread } from '../components/TicketThread'
import { useTicket, useUpdateTicket } from '../hooks/useTickets'
import { formatTicketNumber, statusLabel, ticketPriorities, ticketStatuses, type TicketPriority, type TicketStatus } from '../types'

const selectClass = 'input-base capitalize'

export function TicketDetailPage() {
  const { id = '' } = useParams()
  const { data: ticket, isPending, isError, error, refetch } = useTicket(id)
  const update = useUpdateTicket(id)
  const canUpdate = useCan('tickets.update')
  const canReply = useCan('tickets.reply')
  const { data: assignees } = useUserOptions(canUpdate)

  if (isPending) return <PageSkeleton />
  if (isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>

  const change = (changes: Parameters<typeof update.mutate>[0]) => update.mutate(changes, { onError: (e) => toast.error(e.message) })
  const isClosed = ticket.status === 'closed'

  return (
    <>
      <PageHeader
        title={`${formatTicketNumber(ticket.ticketNumber)} ${ticket.subject}`}
        subtitle={`Opened ${format(parseISO(ticket.createdAt), 'd MMM yyyy, HH:mm')}${ticket.customerName ? ` by ${ticket.customerName}` : ''}${ticket.source === 'portal' ? ' via the portal' : ''}`}
        actions={<TicketStatusBadge ticket={ticket} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="card p-6" aria-labelledby="ticket-conversation">
          <h2 id="ticket-conversation" className="mb-4 text-base font-semibold text-heading">Conversation</h2>
          <TicketThread messages={ticket.messages} />
          {canReply && <TicketReplyForm ticketId={ticket.id} isClosed={isClosed} />}
        </section>
        <div className="lg:col-start-1">
          <CommentsPanel entity="ticket" entityId={ticket.id} title="Team discussion" />
          <DocumentsPanel entityType="ticket" entityId={ticket.id} />
        </div>

        <aside className="card h-fit space-y-4 p-6" aria-label="Ticket details">
          <div>
            <label htmlFor="ticket-status" className="mb-1.5 block text-sm font-medium text-heading">Status</label>
            <Select id="ticket-status" className={selectClass} value={ticket.status} disabled={!canUpdate || update.isPending} onChange={(e) => change({ status: e.target.value as TicketStatus })}>
              {ticketStatuses.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="ticket-priority" className="mb-1.5 block text-sm font-medium text-heading">Priority</label>
            <Select id="ticket-priority" className={selectClass} value={ticket.priority} disabled={!canUpdate || update.isPending} onChange={(e) => change({ priority: e.target.value as TicketPriority })}>
              {ticketPriorities.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="ticket-assignee" className="mb-1.5 block text-sm font-medium text-heading">Assigned to</label>
            <Select id="ticket-assignee" className="input-base" value={ticket.assignedTo ?? ''} disabled={!canUpdate || update.isPending} onChange={(e) => change({ assignedTo: e.target.value || null })}>
              <option value="">Unassigned</option>
              {assignees?.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          </div>
          <dl className="space-y-2 border-t border-border/60 pt-4 text-sm">
            <div className="flex items-center justify-between gap-2"><dt className="text-muted">Priority</dt><dd><TicketPriorityBadge priority={ticket.priority} /></dd></div>
            {!ticket.sla && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Resolve by</dt>
                <dd className={ticket.isSlaBreached ? 'font-medium text-destructive' : 'text-heading'}>{format(parseISO(ticket.slaDueAt), 'd MMM, HH:mm')}</dd>
              </div>
            )}
            {ticket.contactId && <Link to={`/contacts/${ticket.contactId}/edit`} className="link-action -ml-2.5 inline-block">Open customer</Link>}
          </dl>
          {ticket.sla && <SlaCard sla={ticket.sla} />}
        </aside>
      </div>
      <Link to="/support" className="link-action mt-6 inline-block">← Back to support</Link>
    </>
  )
}
