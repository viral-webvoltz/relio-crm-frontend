import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Combobox } from '@/components/ui/Combobox'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DatePicker } from '@/components/ui/DatePicker'
import { FilterChips } from '@/components/ui/FilterChips'
import { httpClient } from '@/lib/httpClient'
import { useListParams } from '@/lib/useListParams'
import { useAuditLogs } from '../hooks/useAuditLogs'
import type { AuditEntry, AuditFilters } from '../types'

type UserOption = { id: string; fullName: string }
const users = async (signal: AbortSignal) => (await httpClient.get<{ data: UserOption[] }>('/users/options', { signal })).data.data

const none: AuditFilters = { entityType: '', action: '', actorId: '', from: '', to: '' }

// Request-level rows have a status code, IP and the submitted fields; explicit audit rows have their own keys. Show whatever is there.
function Details({ entry }: { entry: AuditEntry }) {
  if (Object.keys(entry.metadata).length === 0) return <span className="text-muted">—</span>
  return (
    <details>
      <summary className="inline-flex min-h-8 items-center rounded-lg px-1 text-xs font-medium text-primary">View details</summary>
      <pre className="mt-2 max-h-56 max-w-md overflow-auto whitespace-pre-wrap break-words rounded-xl bg-background p-3 text-xs text-body">{JSON.stringify(entry.metadata, null, 2)}</pre>
    </details>
  )
}

const columns: Column<AuditEntry>[] = [
  { key: 'when', header: 'When', primary: true, cell: (e) => <span className="whitespace-nowrap font-medium text-heading">{format(parseISO(e.createdAt), 'd MMM yyyy, HH:mm')}</span> },
  { key: 'who', header: 'Who', cell: (e) => e.actorName ?? <span className="text-muted">System</span> },
  { key: 'action', header: 'Action', cell: (e) => <code className="rounded-md bg-background px-1.5 py-0.5 text-xs text-heading">{e.action}</code> },
  {
    key: 'record',
    header: 'Record',
    cell: (e) => (
      <>
        <span className="capitalize">{e.entityType}</span>
        {e.entityId && <div className="text-xs text-muted" title={e.entityId}>{e.entityId.slice(0, 8)}…</div>}
      </>
    ),
  },
  { key: 'details', header: 'Details', cell: (e) => <Details entry={e} /> },
]

export function AuditLogPage() {
  const { params, searchParams, update } = useListParams()
  const applied: AuditFilters = {
    entityType: searchParams.get('entityType') ?? '',
    action: searchParams.get('action') ?? '',
    actorId: searchParams.get('actorId') ?? '',
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
  }
  // Edits stay in a draft until "Apply", so typing never fires a request per keystroke.
  const [draft, setDraft] = useState(applied)
  const [seen, setSeen] = useState(searchParams.toString())
  if (seen !== searchParams.toString()) {
    setSeen(searchParams.toString())
    setDraft(applied)
  }

  const { data, isPending, isFetching, isError, error, refetch } = useAuditLogs({ page: params.page, limit: params.limit, ...applied })
  const filtered = Object.values(applied).some(Boolean)
  const badRange = Boolean(draft.from && draft.to && draft.from > draft.to)
  const actorName = (id: string) => data?.data.find((e) => e.actorId === id)?.actorName ?? 'selected user'

  return (
    <>
      <PageHeader title="Audit log" subtitle="Who changed what, and when. Only administrators can see this." />
      <form
        className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!badRange) update({ ...draft, entityType: draft.entityType.trim(), action: draft.action.trim() })
        }}
      >
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-heading">Action</span>
          <input className="input-base" placeholder="e.g. create" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-heading">Record type</span>
          <input className="input-base" placeholder="e.g. leads" value={draft.entityType} onChange={(e) => setDraft({ ...draft, entityType: e.target.value })} />
        </label>
        <Combobox
          label="Who"
          scope="audit-actor"
          emptyLabel="Anyone"
          value={draft.actorId}
          onChange={(actorId) => setDraft({ ...draft, actorId })}
          fetchOptions={async (q, signal) => (await users(signal)).filter((u) => u.fullName.toLowerCase().includes(q.trim().toLowerCase())).map((u) => ({ id: u.id, label: u.fullName }))}
          fetchOne={async (id, signal) => ({ id, label: (await users(signal)).find((u) => u.id === id)?.fullName ?? 'Unknown user' })}
        />
        <div className="text-sm">
          <span className="mb-1.5 block font-medium text-heading">From</span>
          <DatePicker aria-label="From date" value={draft.from} max={draft.to || undefined} onChange={(from) => setDraft({ ...draft, from })} />
        </div>
        <div className="text-sm">
          <span className="mb-1.5 block font-medium text-heading">To</span>
          <DatePicker aria-label="To date" value={draft.to} min={draft.from || undefined} onChange={(to) => setDraft({ ...draft, to })} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={badRange}>Apply</Button>
        </div>
        {badRange && <p role="alert" className="text-sm text-destructive sm:col-span-2 xl:col-span-6">“From” must not be after “To”.</p>}
      </form>

      <FilterChips
        chips={[
          applied.action && { label: `Action: ${applied.action}`, onRemove: () => update({ action: '' }) },
          applied.entityType && { label: `Record: ${applied.entityType}`, onRemove: () => update({ entityType: '' }) },
          applied.actorId && { label: `Who: ${actorName(applied.actorId)}`, onRemove: () => update({ actorId: '' }) },
          applied.from && { label: `From ${applied.from}`, onRemove: () => update({ from: '' }) },
          applied.to && { label: `To ${applied.to}`, onRemove: () => update({ to: '' }) },
        ]}
        onClear={() => update(none)}
      />

      <DataTable
        caption="Audit log"
        columns={columns}
        rows={data?.data}
        rowKey={(e) => e.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{
          title: filtered ? 'No activity matches your filters.' : 'No activity recorded yet.',
          hint: filtered ? 'Try widening the dates or clearing a filter.' : 'Changes made by your team will appear here.',
        }}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
