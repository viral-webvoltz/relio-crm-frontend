import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { Check, Copy, Link2, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Select } from '@/components/ui/Select'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { AccessLink, CreatedAccessLink } from '../api/accessLinksApi'
import { useAccessLinks, useCreateAccessLink, useRevokeAccessLink } from '../hooks/useAccessLinks'

const durations = [
  { minutes: 15, label: '15 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 240, label: '4 hours' },
  { minutes: 1440, label: '24 hours' },
]

const columns: Column<AccessLink>[] = [
  { key: 'by', header: 'Made by', primary: true, cell: (l) => <span className="font-medium text-heading">{l.createdByName}</span> },
  { key: 'created', header: 'Created', cell: (l) => format(parseISO(l.createdAt), 'd MMM yyyy, HH:mm') },
  { key: 'expires', header: 'Expires', cell: (l) => <span title={format(parseISO(l.expiresAt), 'd MMM yyyy, HH:mm')}>{formatDistanceToNow(parseISO(l.expiresAt), { addSuffix: true })}</span> },
]

// The secret exists only in this component's state: the server keeps a hash, so a lost link is revoked and remade.
function NewLink({ created, onDone }: { created: CreatedAccessLink; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/access/${created.token}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      toast.error('Could not copy automatically. Select the link and copy it by hand.')
    }
  }
  return (
    <section className="card mb-4 space-y-2 p-4" aria-label="New link">
      <p className="text-sm text-heading">Share this link. Anyone who opens it is signed in to this account until {format(parseISO(created.expiresAt), 'd MMM yyyy, HH:mm')}. It is shown only once.</p>
      <div className="flex gap-2">
        <input readOnly aria-label="Access link" value={url} onFocus={(e) => e.currentTarget.select()} className="input-base min-w-0 flex-1 font-mono text-xs" />
        <button type="button" className="btn-ghost" onClick={copy}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="btn-ghost" onClick={onDone}>Done</button>
      </div>
    </section>
  )
}

export function AccessLinksPage() {
  const { data, isPending, isFetching, isError, error, refetch } = useAccessLinks()
  const create = useCreateAccessLink()
  const revoke = useRevokeAccessLink()
  const [minutes, setMinutes] = useState(60)
  const [created, setCreated] = useState<CreatedAccessLink | null>(null)

  const handleRevoke = async (link: AccessLink) => {
    if (!(await confirmDialog('Anyone using this link is signed out straight away, and it stops working.', { title: 'Revoke this link?', confirmLabel: 'Revoke link' }))) return
    revoke.mutate(link.id, { onSuccess: () => toast.success('Link revoked'), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <PageHeader
        title="Client access links"
        subtitle="Give a client a link that signs them in to this account for a limited time. They will not see this page."
      />
      <section className="card mb-4 flex flex-wrap items-end gap-3 p-4" aria-label="Create a link">
        <div className="w-full sm:w-52">
          <label htmlFor="link-duration" className="mb-1.5 block text-sm font-medium text-heading">Link lasts</label>
          <Select id="link-duration" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {durations.map((d) => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
          </Select>
        </div>
        <button type="button" className="btn-primary w-full whitespace-nowrap sm:w-auto" disabled={create.isPending} onClick={() => create.mutate(minutes, { onSuccess: setCreated, onError: (e) => toast.error(e.message) })}>
          <Plus className="size-4" aria-hidden /> {create.isPending ? 'Creating…' : 'Create link'}
        </button>
        <p className="w-full text-xs text-muted">After that time the link stops working and the client is signed out.</p>
      </section>
      {created && <NewLink key={created.id} created={created} onDone={() => setCreated(null)} />}
      <DataTable
        caption="Active access links"
        columns={columns}
        rows={data}
        rowKey={(l) => l.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'No active links.', hint: 'Create one to let a client in without sharing your password.', icon: Link2 }}
        actions={(l) => <button type="button" className="link-danger" disabled={revoke.isPending} onClick={() => handleRevoke(l)}>Revoke</button>}
      />
    </>
  )
}
