import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ListTools } from '@/components/layout/ListTools'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { Select } from '@/components/ui/Select'
import { useCan } from '@/features/auth/hooks/useCan'
import { useListParams } from '@/lib/useListParams'
import { SlaSummaryStrip } from '../components/SlaSummaryStrip'
import { SlaBadge, TicketPriorityBadge, TicketStatusBadge } from '../components/TicketBadges'
import { dueText, liveState, useNow } from '../components/slaTime'
import { useTickets } from '../hooks/useTickets'
import { formatTicketNumber, statusLabel, ticketPriorities, ticketStatuses, type Ticket } from '../types'

const selectClass = 'w-auto capitalize'

// Status, the resolve clock (state + when), and a first-reply warning only when that clock needs attention.
function StatusCell({ ticket }: { ticket: Ticket }) {
  const now = useNow()
  const first = ticket.sla?.firstResponse
  const firstState = first ? liveState(first.state, first.dueAt, now) : null
  const resolution = ticket.sla?.resolution
  const showDue = resolution && ['ok', 'warning', 'breached'].includes(liveState(resolution.state, resolution.dueAt, now))
  return (
    <div className="space-y-1">
      <TicketStatusBadge ticket={ticket} />
      {showDue && <div className="text-xs text-muted">Due {dueText(resolution.dueAt, now)}</div>}
      {first && (firstState === 'warning' || firstState === 'breached') && <SlaBadge state={firstState} prefix="Reply" />}
    </div>
  )
}

const columns: Column<Ticket>[] = [
  {
    key: 'ticket',
    header: 'Ticket',
    primary: true,
    cell: (ticket) => (
      <>
        <Link to={`/support/${ticket.id}`} className="font-medium text-primary hover:underline">{formatTicketNumber(ticket.ticketNumber)} {ticket.subject}</Link>
        {ticket.source === 'portal' && <div className="text-xs text-muted">From the customer portal</div>}
      </>
    ),
  },
  { key: 'customer', header: 'Customer', cell: (ticket) => ticket.customerName ?? <span className="text-muted">—</span> },
  { key: 'status', header: 'Status', cell: (ticket) => <StatusCell ticket={ticket} /> },
  { key: 'priority', header: 'Priority', cell: (ticket) => <TicketPriorityBadge priority={ticket.priority} /> },
  { key: 'assignee', header: 'Assignee', cell: (ticket) => ticket.assigneeName ?? <span className="text-muted">Unassigned</span> },
  { key: 'updated', header: 'Updated', cell: (ticket) => <span className="text-muted">{format(parseISO(ticket.updatedAt), 'd MMM, HH:mm')}</span> },
]

const assigneeLabel: Record<string, string> = { me: 'Assigned to me', unassigned: 'Unassigned' }

export function TicketsPage() {
  const { params, searchParams, update } = useListParams(columns)
  const [, setSearchParams] = useSearchParams()
  // No status in the URL means "open and waiting"; "all" is spelled out.
  const filters = { status: searchParams.get('status') ?? 'active', priority: searchParams.get('priority') ?? '', assignee: searchParams.get('assignee') ?? '', sla: searchParams.get('sla') ?? '' }
  const { data, isPending, isFetching, isError, error, refetch } = useTickets({ ...params, ...filters, status: filters.status === 'all' ? '' : filters.status })
  const canCreate = useCan('tickets.create')
  const filtered = Boolean(params.search || filters.priority || filters.assignee || filters.sla || filters.status !== 'active')

  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Customer questions and problems, with response targets."
        actions={
          canCreate && (
            <Link to="/support/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> New ticket
            </Link>
          )
        }
      />
      <SlaSummaryStrip />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search # or subject" onSearch={(search) => update({ search })} />
        <Select aria-label="Filter by status" value={filters.status} onChange={(e) => update({ status: e.target.value === 'active' ? '' : e.target.value })} className={selectClass}>
          <option value="active">Open and waiting</option>
          <option value="all">All statuses</option>
          {ticketStatuses.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </Select>
        <Select aria-label="Filter by priority" value={filters.priority} onChange={(e) => update({ priority: e.target.value })} className={selectClass}>
          <option value="">Any priority</option>
          {ticketPriorities.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select aria-label="Filter by assignee" value={filters.assignee} onChange={(e) => update({ assignee: e.target.value })} className={selectClass}>
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </Select>
        <label className="flex min-h-11 items-center gap-2 text-sm text-body">
          <input type="checkbox" className="size-4 accent-primary" checked={filters.sla === 'breached'} onChange={(e) => update({ sla: e.target.checked ? 'breached' : '' })} />
          SLA breached only
        </label>
        <ListTools resource="tickets" />
      </div>
      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
          filters.status !== 'active' && { label: `Status: ${filters.status === 'all' ? 'All' : (statusLabel[filters.status as keyof typeof statusLabel] ?? filters.status)}`, onRemove: () => update({ status: '' }) },
          filters.priority && { label: `Priority: ${filters.priority}`, onRemove: () => update({ priority: '' }) },
          filters.assignee && { label: assigneeLabel[filters.assignee] ?? filters.assignee, onRemove: () => update({ assignee: '' }) },
          filters.sla && { label: 'SLA breached', onRemove: () => update({ sla: '' }) },
        ]}
        onClear={() => setSearchParams((p) => { const next = new URLSearchParams(p); ['search', 'status', 'priority', 'assignee', 'sla', 'page'].forEach((k) => next.delete(k)); return next })}
      />
      <DataTable
        caption="Support tickets"
        columns={columns}
        columnsPref="tickets"
        rows={data?.data}
        rowKey={(ticket) => ticket.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: filtered ? 'No tickets match your filters' : 'No tickets yet', hint: filtered ? 'Try a different search or clear the filters.' : 'Tickets raised by customers or created by your team appear here.' }}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
