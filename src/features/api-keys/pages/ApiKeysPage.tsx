import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { KeyRound, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { CreateKeyDialog } from '../components/CreateKeyDialog'
import { KeyStatus } from '../components/KeyStatus'
import { RevealKeyDialog } from '../components/RevealKeyDialog'
import { useApiKeys, useRevokeApiKey } from '../hooks/useApiKeys'
import { scopeFullName } from '../scopes'
import { apiBaseUrl, apiDocsUrl } from '../usage'
import { keyStatus, type ApiKey, type CreatedApiKey } from '../types'

const day = (iso: string) => format(parseISO(iso), 'd MMM yyyy')

const columns: Column<ApiKey>[] = [
  {
    key: 'name',
    header: 'Key',
    primary: true,
    cell: (k) => (
      <>
        <div className="font-medium text-heading">{k.name}</div>
        <div className="mt-0.5 font-mono text-xs text-muted">{k.keyPrefix}…</div>
      </>
    ),
  },
  { key: 'status', header: 'Status', cell: (k) => <KeyStatus apiKey={k} /> },
  {
    key: 'scopes',
    header: 'Can do',
    cell: (k) => (
      <details>
        <summary className="cursor-pointer text-sm text-primary">{k.scopes.length} thing{k.scopes.length === 1 ? '' : 's'}</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-body">
          {k.scopes.map((s) => <li key={s}>{scopeFullName(s)}</li>)}
        </ul>
      </details>
    ),
  },
  { key: 'created', header: 'Created', cell: (k) => <>{day(k.createdAt)}{k.createdByName && <div className="text-xs text-muted">by {k.createdByName}</div>}</> },
  { key: 'lastUsed', header: 'Last used', cell: (k) => (k.lastUsedAt ? <span title={format(parseISO(k.lastUsedAt), 'd MMM yyyy, HH:mm')}>{formatDistanceToNow(parseISO(k.lastUsedAt), { addSuffix: true })}</span> : <span className="text-muted">Never</span>) },
  { key: 'expires', header: 'Expires', cell: (k) => (k.expiresAt ? day(k.expiresAt) : <span className="text-muted">Never</span>) },
]

export function ApiKeysPage() {
  const { data, isPending, isFetching, isError, error, refetch } = useApiKeys()
  const revoke = useRevokeApiKey()
  const [creating, setCreating] = useState(false)
  // The secret lives only here, only while the reveal dialog is open.
  const [revealed, setRevealed] = useState<CreatedApiKey | null>(null)

  const handleRevoke = async (key: ApiKey) => {
    if (!(await confirmDialog(`Revoke “${key.name}”? Anything using this key stops working straight away, and a revoked key cannot be turned back on.`, { title: 'Revoke this key?', confirmLabel: 'Revoke key' }))) return
    revoke.mutate(key.id, { onSuccess: () => toast.success(`“${key.name}” was revoked`), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <PageHeader
        title="API keys"
        subtitle="Let a script or another app work with your CRM data without anyone signing in."
        actions={<button type="button" className="btn-primary" onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden /> Create key</button>}
      />
      <section className="card mb-4 flex gap-3 p-4 text-sm text-body" aria-label="How API keys work">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p>A key acts as the person who made it and can only do what was ticked when it was created. It is shown once, so copy it straight away.</p>
          <p>Scripts send it as <code className="font-mono text-xs">Authorization: Bearer YOUR_KEY</code> to <code className="break-all font-mono text-xs">{apiBaseUrl}</code>. <a href={apiDocsUrl} target="_blank" rel="noopener noreferrer" className="link-action">Open the API reference</a> (opens in a new tab, for admins).</p>
        </div>
      </section>
      <DataTable
        caption="API keys"
        columns={columns}
        rows={data}
        rowKey={(k) => k.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'No API keys yet.', hint: 'Create one when you want a script or integration to read or write your CRM data.', icon: KeyRound }}
        actions={(k) => keyStatus(k) === 'revoked' ? null : <button type="button" className="link-danger" disabled={revoke.isPending} onClick={() => handleRevoke(k)}>Revoke</button>}
      />
      <CreateKeyDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(created) => {
          setCreating(false)
          setRevealed(created)
        }}
      />
      <RevealKeyDialog created={revealed} onDone={() => setRevealed(null)} />
    </>
  )
}
