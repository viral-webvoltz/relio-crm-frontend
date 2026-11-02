import { zodResolver } from '@hookform/resolvers/zod'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { format, isBefore, parseISO } from 'date-fns'
import { Megaphone, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { describedBy, FieldLabel, FieldMessages, useFieldIds } from '@/components/ui/FieldParts'
import { useCan } from '@/features/auth/hooks/useCan'
import { useListParams } from '@/lib/useListParams'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import type { Notice } from '../api/portalAdminApi'
import { useDeleteNotice, useNotices, useSaveNotice } from '../hooks/usePortalAdmin'

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Keep the title under 200 characters'),
  body: z.string().trim().min(1, 'Write the message customers will see').max(5000, 'Keep the message under 5,000 characters'),
  isPublished: z.boolean(),
  expiresAt: z.string(),
})
type FormValues = z.infer<typeof schema>

const noticeState = (n: Notice) => (!n.isPublished ? { label: 'Draft', tone: 'neutral' as const } : n.expiresAt && isBefore(parseISO(n.expiresAt), new Date()) ? { label: 'Expired', tone: 'warning' as const } : { label: 'Live', tone: 'success' as const })

function NoticeForm({ notice, onDone }: { notice: Notice | null; onDone: () => void }) {
  const save = useSaveNotice(notice?.id)
  const bodyIds = useFieldIds()
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: notice?.title ?? '', body: notice?.body ?? '', isPublished: notice?.isPublished ?? false, expiresAt: notice?.expiresAt ? notice.expiresAt.slice(0, 10) : '' },
  })
  useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  const onSubmit = (v: FormValues) =>
    save.mutate(
      { title: v.title, body: v.body, isPublished: v.isPublished, expiresAt: v.expiresAt ? new Date(`${v.expiresAt}T23:59:59`).toISOString() : null },
      { onSuccess: () => { toast.success(notice ? 'Notice updated' : 'Notice created'); onDone() } },
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 p-6">
      <h2 className="text-lg font-semibold text-heading">{notice ? 'Edit notice' : 'New notice'}</h2>
      <Field label="Title" required error={errors.title?.message} {...register('title')} />
      <div className="space-y-1.5">
        <FieldLabel id={bodyIds.id} label="Message" required />
        <textarea id={bodyIds.id} rows={5} aria-required aria-invalid={errors.body ? true : undefined} aria-describedby={describedBy(bodyIds, undefined, errors.body?.message)} className="input-base h-auto py-2.5 aria-invalid:border-destructive" {...register('body')} />
        <FieldMessages {...bodyIds} error={errors.body?.message} />
      </div>
      <Field label="Hide after (optional)" type="date" hint="Leave empty to keep it showing." error={errors.expiresAt?.message} {...register('expiresAt')} />
      <Checkbox label="Publish now (customers can see it)" {...register('isPublished')} />
      {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}

export function NoticesAdminPage() {
  const { params, update } = useListParams()
  const { data, isPending, isFetching, isError, error, refetch } = useNotices(params)
  const remove = useDeleteNotice()
  const canManage = useCan('portal.manage')
  const [editing, setEditing] = useState<Notice | 'new' | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (editing && !dialog.current?.open) dialog.current?.showModal()
  }, [editing])

  const handleDelete = async (n: Notice) => {
    if (!(await confirmDialog(`Delete the notice "${n.title}"? Customers will no longer see it.`))) return
    remove.mutate(n.id, { onSuccess: () => toast.success('Notice deleted'), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<Notice>[] = [
    { key: 'title', header: 'Notice', primary: true, cell: (n) => <><div className="font-medium text-heading">{n.title}</div><div className="line-clamp-1 text-xs text-muted">{n.body}</div></> },
    { key: 'state', header: 'Status', cell: (n) => { const s = noticeState(n); return <Badge tone={s.tone}>{s.label}</Badge> } },
    { key: 'published', header: 'Published', cell: (n) => (n.publishedAt ? format(parseISO(n.publishedAt), 'd MMM yyyy') : '—') },
    { key: 'expires', header: 'Hides after', cell: (n) => (n.expiresAt ? format(parseISO(n.expiresAt), 'd MMM yyyy') : '—') },
  ]

  if (!canManage) return <p role="alert" className="card p-6 text-sm text-muted">You do not have access to customer notices.</p>

  return (
    <>
      <PageHeader
        title="Customer notices"
        subtitle="News and updates shown in the customer portal."
        actions={<Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden /> New notice</Button>}
      />
      <DataTable
        caption="Customer notices"
        columns={columns}
        rows={data?.data}
        rowKey={(n) => n.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ icon: Megaphone, title: 'No notices yet', hint: 'Create one to show a message in the customer portal.' }}
        actions={(n) => (
          <>
            <button type="button" className="link-action" onClick={() => setEditing(n)}>Edit</button>
            <button type="button" className="link-danger" onClick={() => handleDelete(n)}>Delete</button>
          </>
        )}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />

      <dialog
        ref={dialog}
        aria-label="Notice"
        onClose={() => setEditing(null)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/70 bg-surface p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      >
        {editing && <NoticeForm key={editing === 'new' ? 'new' : editing.id} notice={editing === 'new' ? null : editing} onDone={() => dialog.current?.close()} />}
      </dialog>
    </>
  )
}
