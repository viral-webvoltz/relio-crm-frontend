import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useDeleteWebhook, useToggleWebhook, useWebhooks } from '../hooks/useWebhooks'
import type { WebhookEndpoint } from '../types'

export function WebhooksPage() {
  const { data, isPending, isFetching, isError, error, refetch } = useWebhooks()
  const toggle = useToggleWebhook()
  const remove = useDeleteWebhook()

  const handleToggle = (hook: WebhookEndpoint) =>
    toggle.mutate(
      { id: hook.id, isActive: !hook.isActive },
      { onSuccess: () => toast.success(hook.isActive ? 'Webhook paused' : 'Webhook turned on'), onError: (e) => toast.error(e.message) },
    )

  const handleDelete = async (hook: WebhookEndpoint) => {
    if (!(await confirmDialog(`Delete the webhook for ${hook.url}? It will stop receiving events and its delivery history is removed.`, { title: 'Delete webhook?' }))) return
    remove.mutate(hook.id, { onSuccess: () => toast.success('Webhook deleted'), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<WebhookEndpoint>[] = [
    {
      key: 'url',
      header: 'Endpoint',
      primary: true,
      cell: (hook) => (
        <>
          <div className="break-all font-medium text-heading">{hook.url}</div>
          <div className="mt-1 text-xs text-muted">{hook.events.includes('*') ? 'All events' : hook.events.join(', ')}</div>
        </>
      ),
    },
    { key: 'status', header: 'Status', cell: (hook) => <StatusBadge domain="active" status={hook.isActive ? 'active' : 'inactive'} /> },
    { key: 'created', header: 'Added', cell: (hook) => format(parseISO(hook.createdAt), 'd MMM yyyy') },
  ]

  return (
    <>
      <PageHeader
        title="Webhooks"
        subtitle="Send an event to another system whenever something changes here."
        actions={
          <Link to="/settings/webhooks/new" className="btn-primary">
            <Plus className="size-4" aria-hidden /> New webhook
          </Link>
        }
      />
      <DataTable
        caption="Webhooks"
        columns={columns}
        rows={data}
        rowKey={(hook) => hook.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'No webhooks yet.', hint: 'Add one to be notified in another system when records change.' }}
        actions={(hook) => (
          <>
            <button type="button" className="link-action" disabled={toggle.isPending} onClick={() => handleToggle(hook)}>
              {hook.isActive ? 'Pause' : 'Turn on'}
            </button>
            <Link to={`/settings/webhooks/${hook.id}/deliveries`} className="link-action">Deliveries</Link>
            <Link to={`/settings/webhooks/${hook.id}/edit`} className="link-action">Edit</Link>
            <button type="button" className="link-danger" onClick={() => handleDelete(hook)}>Delete</button>
          </>
        )}
      />
    </>
  )
}
