import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { useCan } from '@/features/auth/hooks/useCan'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useAddSuppression, useRemoveSuppression, useSuppressions } from '../hooks/useCampaigns'
import type { Suppression } from '../types'

const schema = z.object({ email: z.string().trim().min(1, 'Enter an email address').email('Enter a valid email address').max(254) })

export function SuppressionsPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const { data, isPending, isFetching, isError, error, refetch } = useSuppressions({ page, limit })
  const canManage = useCan('campaigns.send')
  const add = useAddSuppression()
  const remove = useRemoveSuppression()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } })
  useServerFieldErrors(add.error, setError)

  const handleRemove = async (s: Suppression) => {
    const ok = await confirmDialog(
      s.reason === 'unsubscribed'
        ? `${s.email} asked not to get these emails. Removing them means they may be emailed again by future campaigns. Only do this if they have asked to hear from you again.`
        : `Remove ${s.email} from the list? They may be emailed again by future campaigns.`,
      { title: 'Allow emails again?', confirmLabel: 'Remove from list' },
    )
    if (!ok) return
    remove.mutate(s.id, { onSuccess: () => toast.success(`${s.email} can be emailed again`), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<Suppression>[] = [
    { key: 'email', header: 'Email address', primary: true, cell: (s) => <span className="font-medium text-heading">{s.email}</span> },
    { key: 'reason', header: 'Why', cell: (s) => <Badge tone={s.reason === 'unsubscribed' ? 'warning' : 'neutral'}>{s.reason === 'unsubscribed' ? 'unsubscribed' : 'added by your team'}</Badge> },
    { key: 'added', header: 'Added', cell: (s) => <span className="text-muted">{format(parseISO(s.createdAt), 'd MMM yyyy')}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Do-not-email list"
        subtitle="People on this list are skipped by every campaign."
        actions={<Link to="/campaigns" className="btn-ghost">Back to campaigns</Link>}
      />
      <p className="mb-4 max-w-2xl text-sm text-body">
        When someone uses the unsubscribe link in a campaign, they are added here automatically. You can also add an address yourself. This only affects campaigns: messages about an order, invoice or support request are still sent.
      </p>
      {canManage && (
        <form
          noValidate
          className="card mb-6 grid max-w-xl gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={handleSubmit(({ email }) =>
            add.mutate(email, {
              onSuccess: () => {
                toast.success(`${email} will not receive campaigns`)
                reset()
              },
              onError: (e) => toast.error(e.message),
            }),
          )}
        >
          <Field label="Add an address" type="email" required autoComplete="off" placeholder="name@example.com" error={errors.email?.message} {...register('email')} />
          <Button type="submit" loading={add.isPending}>{add.isPending ? 'Adding…' : 'Add to list'}</Button>
        </form>
      )}
      <DataTable
        caption="Addresses that will not receive campaigns"
        columns={columns}
        rows={data?.data}
        rowKey={(s) => s.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'Nobody is on the list', hint: 'Addresses appear here when people unsubscribe or when you add them.' }}
        actions={canManage ? (s) => <button type="button" className="link-danger" disabled={remove.isPending} onClick={() => handleRemove(s)}>Remove</button> : undefined}
        meta={data?.meta}
        onPageChange={setPage}
        onPageSizeChange={(next) => { setLimit(next); setPage(1) }}
      />
    </>
  )
}
