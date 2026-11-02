import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { Mail, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { MailAccount } from '../api'
import { HowToConnect } from '../components/HowToConnect'
import { useActivateMailAccount, useMailSettings, useRemoveMailAccount, useTestMailAccount } from '../hooks/useMailSettings'

export function MailAccountsPage() {
  const { data, isPending, isFetching, isError, error, refetch } = useMailSettings()
  const activate = useActivateMailAccount()
  const remove = useRemoveMailAccount()
  const test = useTestMailAccount()
  const active = data?.accounts.find((a) => a.isActive)

  const handleActivate = (account: MailAccount) =>
    activate.mutate(account.id, { onSuccess: () => toast.success(`Emails now go out from ${account.fromEmail}`), onError: (e) => toast.error(e.message) })

  const handleTest = (account: MailAccount) =>
    test.mutate(account.id, { onSuccess: (message) => toast.success(message), onError: (e) => toast.error(e.message) })

  const handleRemove = async (account: MailAccount) => {
    const message = account.isActive
      ? `Remove ${account.fromEmail}? It is the account emails go out from, so the most recently added account will take over.`
      : `Remove ${account.fromEmail}?`
    if (!(await confirmDialog(message, { title: 'Remove email account?', confirmLabel: 'Remove' }))) return
    remove.mutate(account.id, { onSuccess: () => toast.success('Email account removed'), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<MailAccount>[] = [
    {
      key: 'account',
      header: 'Gmail account',
      primary: true,
      cell: (a) => (
        <>
          <div className="break-all font-medium text-heading">{a.fromEmail}</div>
          {a.fromName && <div className="mt-1 text-xs text-muted">Sends as {a.fromName}</div>}
        </>
      ),
    },
    { key: 'status', header: 'Status', cell: (a) => (a.isActive ? <Badge tone="success">active</Badge> : <Badge>not in use</Badge>) },
    {
      key: 'replies',
      header: 'Reading replies',
      cell: (a) =>
        a.syncError ? (
          <span className="text-xs text-warning">{a.syncError}</span>
        ) : a.lastSyncedAt ? (
          <span className="text-xs text-muted">Checked {formatDistanceToNow(parseISO(a.lastSyncedAt), { addSuffix: true })}</span>
        ) : (
          <span className="text-xs text-muted">Not checked yet</span>
        ),
    },
    { key: 'added', header: 'Added', cell: (a) => format(parseISO(a.createdAt), 'd MMM yyyy') },
  ]

  const subtitle =
    data?.source === 'organization' && active
      ? `Emails go out from ${active.fromEmail}.`
      : data?.source === 'server'
        ? 'No account chosen. Emails go out from the server default.'
        : 'Add a Gmail account to start sending email from your CRM.'

  return (
    <>
      <PageHeader
        title="Email configuration"
        subtitle={subtitle}
        actions={
          <Link to="/settings/email/new" className="btn-primary">
            <Plus className="size-4" aria-hidden /> Add email account
          </Link>
        }
      />
      <div className="space-y-6">
        <DataTable
          caption="Email accounts"
          columns={columns}
          rows={data?.accounts}
          rowKey={(a) => a.id}
          loading={isPending}
          refreshing={isFetching}
          error={isError ? error : null}
          onRetry={() => refetch()}
          empty={{ title: 'No email accounts yet.', hint: 'Add a Gmail account, then choose which one is active.', icon: Mail }}
          actions={(a) => (
            <>
              {!a.isActive && (
                <button type="button" className="link-action" disabled={activate.isPending} onClick={() => handleActivate(a)}>
                  Make active
                </button>
              )}
              <button type="button" className="link-action" disabled={test.isPending} onClick={() => handleTest(a)}>
                Send test
              </button>
              <Link to={`/settings/email/${a.id}/edit`} className="link-action">Edit</Link>
              <button type="button" className="link-danger" onClick={() => void handleRemove(a)}>Remove</button>
            </>
          )}
        />
        <HowToConnect />
      </div>
    </>
  )
}
