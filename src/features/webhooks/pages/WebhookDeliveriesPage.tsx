import { format, parseISO } from 'date-fns'
import { Send } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useListParams } from '@/lib/useListParams'
import { useDeliveries, useSendTestEvent, useWebhooks } from '../hooks/useWebhooks'
import { deliveryTone, type WebhookDelivery } from '../types'

const when = (iso: string | null) => (iso ? format(parseISO(iso), 'd MMM yyyy, HH:mm') : '—')

const columns: Column<WebhookDelivery>[] = [
  { key: 'event', header: 'Event', primary: true, cell: (d) => <code className="rounded-md bg-background px-1.5 py-0.5 text-xs text-heading">{d.event}</code> },
  { key: 'status', header: 'Status', cell: (d) => <Badge tone={deliveryTone[d.status]}>{d.status}</Badge> },
  {
    key: 'result',
    header: 'Result',
    cell: (d) => (
      <>
        {d.responseStatus ? `HTTP ${d.responseStatus}` : '—'}
        {d.lastError && <div className="max-w-xs break-words text-xs text-destructive">{d.lastError}</div>}
      </>
    ),
  },
  { key: 'attempts', header: 'Tries', cell: (d) => d.attempts },
  { key: 'created', header: 'Queued', cell: (d) => when(d.createdAt) },
  { key: 'delivered', header: 'Delivered', cell: (d) => (d.deliveredAt ? when(d.deliveredAt) : d.status === 'failed' ? 'Gave up' : d.nextAttemptAt ? `Next try ${when(d.nextAttemptAt)}` : '—') },
]

export function WebhookDeliveriesPage() {
  const { id } = useParams()
  const { params, update } = useListParams()
  const hooks = useWebhooks()
  const hook = hooks.data?.find((h) => h.id === id)
  const { data, isPending, isFetching, isError, error, refetch } = useDeliveries(id, { page: params.page, limit: params.limit })
  const test = useSendTestEvent()

  return (
    <>
      <PageHeader
        title="Deliveries"
        subtitle={hook ? `Events sent to ${hook.url}` : 'Events sent to this webhook.'}
        actions={
          <div className="flex gap-2">
            <Link to="/settings/webhooks" className="btn-ghost">Back to webhooks</Link>
            <Button
              disabled={test.isPending || !hook?.isActive}
              title={hook && !hook.isActive ? 'Turn the webhook on to send a test' : undefined}
              onClick={() => id && test.mutate(id, { onSuccess: () => toast.success('Test event queued. It appears below within a few seconds.'), onError: (e) => toast.error(e.message) })}
            >
              <Send className="size-4" aria-hidden /> {test.isPending ? 'Sending…' : 'Send test'}
            </Button>
          </div>
        }
      />
      <DataTable
        caption="Webhook deliveries"
        columns={columns}
        rows={data?.data}
        rowKey={(d) => d.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'Nothing has been sent yet.', hint: 'Use “Send test” to check that your endpoint receives events.' }}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
