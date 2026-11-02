import { format, parseISO } from 'date-fns'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useRuns } from '../hooks/useSubscriptions'
import type { SubscriptionRun } from '../types'

// Failures are recorded by the server as the error message of whatever went wrong; known ones get a plain explanation.
const runErrorText = (error: string | null) => {
  if (!error) return 'Something went wrong while billing. It will be tried again automatically.'
  if (/no active user/i.test(error)) return 'There is no active user to bill as. Ask an administrator to check the users.'
  if (/not available|inactive/i.test(error)) return `${error} Edit the subscription to replace it.`
  return error
}

const columns: Column<SubscriptionRun>[] = [
  { key: 'date', header: 'Billing date', primary: true, cell: (r) => <span className="font-medium text-heading">{format(parseISO(r.scheduledFor), 'd MMM yyyy')}</span> },
  {
    key: 'status',
    header: 'Result',
    // Icon plus word, so the result never relies on colour alone.
    cell: (r) =>
      r.status === 'invoiced' ? (
        <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="size-4" aria-hidden /> Invoice created</span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-destructive"><XCircle className="size-4" aria-hidden /> Failed</span>
      ),
  },
  {
    key: 'invoice',
    header: 'Invoice',
    cell: (r) => (r.invoiceId ? <Link to={`/invoices/${r.invoiceId}`} className="link-action">Open invoice</Link> : <span className="text-muted">—</span>),
  },
  { key: 'details', header: 'Details', cell: (r) => (r.status === 'failed' ? <span className="text-destructive">{runErrorText(r.error)}</span> : <span className="text-muted">{format(parseISO(r.createdAt), 'd MMM yyyy, HH:mm')}</span>) },
]

const PAGE_SIZE = 10

export function RunsTable({ subscriptionId }: { subscriptionId: string }) {
  const [page, setPage] = useState(1)
  const { data, isPending, isFetching, isError, error, refetch } = useRuns(subscriptionId, { page, limit: PAGE_SIZE })
  return (
    <DataTable
      caption="Billing history"
      columns={columns}
      rows={data?.data}
      rowKey={(r) => r.id}
      loading={isPending}
      refreshing={isFetching}
      error={isError ? error : null}
      onRetry={() => refetch()}
      empty={{ title: 'No invoices yet.', hint: 'Each billing date adds a row here, with a link to its invoice.' }}
      meta={data?.meta}
      onPageChange={setPage}
    />
  )
}
