import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useRecipients } from '../hooks/useCampaigns'
import type { Recipient } from '../types'

const day = (iso: string | null) => (iso ? format(parseISO(iso), 'd MMM, HH:mm') : '—')

function Delivery({ r }: { r: Recipient }) {
  if (r.deliveryStatus === 'sent') return <Badge tone="success">sent</Badge>
  if (r.deliveryStatus === 'failed')
    return (
      <>
        <Badge tone="danger">not sent</Badge>
        {r.deliveryError && <div className="mt-1 text-xs text-muted">{r.deliveryError}</div>}
      </>
    )
  return <Badge tone="info">waiting</Badge>
}

const columns: Column<Recipient>[] = [
  { key: 'email', header: 'Email', primary: true, cell: (r) => <span className="font-medium text-heading">{r.email}</span> },
  { key: 'delivery', header: 'Delivery', cell: (r) => <Delivery r={r} /> },
  { key: 'opened', header: 'Opened', cell: (r) => <span className="text-muted">{day(r.openedAt)}</span> },
  { key: 'clicked', header: 'Clicked', cell: (r) => <span className="text-muted">{day(r.clickedAt)}</span> },
  { key: 'unsub', header: 'Unsubscribed', cell: (r) => (r.unsubscribedAt ? <Badge tone="warning">unsubscribed</Badge> : <span className="text-muted">—</span>) },
]

// Everyone the campaign was sent to, fixed at the moment it was sent.
export function RecipientsTable({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { data, isPending, isFetching, isError, error, refetch } = useRecipients(campaignId, { page, limit })
  return (
    <section aria-labelledby="recipients-heading">
      <h2 id="recipients-heading" className="mb-3 text-base font-semibold text-heading">People it was sent to</h2>
      <DataTable
        caption="Campaign recipients"
        columns={columns}
        rows={data?.data}
        rowKey={(r) => r.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'Nobody yet', hint: 'People appear here once the campaign is sent.' }}
        meta={data?.meta}
        onPageChange={setPage}
        onPageSizeChange={(next) => { setLimit(next); setPage(1) }}
      />
    </section>
  )
}
