import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { statusTone } from '@/features/tickets/types'
import { parseListParams } from '@/lib/apiTypes'
import { usePortalTickets } from '../hooks/usePortal'
import { portalStatusLabel } from '../tickets'

type PortalTicket = NonNullable<ReturnType<typeof usePortalTickets>['data']>['data'][number]

const columns: Column<PortalTicket>[] = [
  {
    key: 'request',
    header: 'Request',
    primary: true,
    cell: (ticket) => <Link to={`/portal/support/${ticket.id}`} className="font-medium text-primary hover:underline">#{ticket.ticketNumber} {ticket.subject}</Link>,
  },
  { key: 'status', header: 'Status', cell: (ticket) => <Badge tone={statusTone[ticket.status]}>{portalStatusLabel[ticket.status]}</Badge> },
  { key: 'updated', header: 'Last update', cell: (ticket) => <span className="text-muted">{format(parseISO(ticket.updatedAt), 'd MMM yyyy, HH:mm')}</span> },
]

export function PortalTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { page } = parseListParams(searchParams)
  const { data, isPending, isFetching, isError, error, refetch } = usePortalTickets(page)

  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Ask a question or report a problem."
        actions={
          <Link to="/portal/support/new" className="btn-primary">
            <Plus className="size-4" aria-hidden /> New request
          </Link>
        }
      />
      <DataTable
        caption="Your support requests"
        columns={columns}
        rows={data?.data}
        rowKey={(ticket) => ticket.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'No support requests yet', hint: 'Need help? Start a new request and we will get back to you.' }}
        meta={data?.meta}
        onPageChange={(next) => setSearchParams(next > 1 ? { page: String(next) } : {})}
      />
    </>
  )
}
