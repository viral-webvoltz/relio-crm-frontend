import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Field } from '@/components/ui/Field'
import { type ApiError } from '@/lib/httpClient'
import { useIdempotencyKey } from '@/lib/idempotency'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { useCreateTeam, useSetMembers, useTeam, useUpdateTeam } from '../hooks/useTeams'
import type { Team, TeamDetail } from '../types'
import { DialogShell } from './DialogShell'
import { MemberPicker } from './MemberPicker'

type Person = { id: string; fullName: string }

const schema = z.object({
  name: z.string().trim().min(1, 'Give the team a name').max(80, 'Keep the name under 80 characters'),
  description: z.string().trim().max(300, 'Keep the description under 300 characters'),
  members: z.array(z.string()).max(200, 'A team can have at most 200 people'),
})
type Values = z.infer<typeof schema>

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))

function TeamForm({ existing, people, close }: { existing?: TeamDetail; people: Person[]; close: () => void }) {
  const key = useIdempotencyKey()
  const create = useCreateTeam()
  const update = useUpdateTeam()
  const setMembers = useSetMembers()
  const activeIds = existing?.members.filter((m) => m.isActive).map((m) => m.id) ?? []
  const inactive = existing?.members.filter((m) => !m.isActive).length ?? 0

  // What is already saved on the server. A failed second step (members after create) must not make "try again" create a second team.
  const baseline = useRef<{ id: string | undefined; name: string; description: string; members: string[] }>({
    id: existing?.id,
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    members: activeIds,
  })
  const [error, setError] = useState<ApiError | null>(null)
  const [partial, setPartial] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, control, handleSubmit, setError: setFieldError, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: existing?.name ?? '', description: existing?.description ?? '', members: activeIds },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(error, setFieldError)

  const onSubmit = async (v: Values) => {
    setError(null)
    setSaving(true)
    const base = baseline.current
    const name = v.name.trim()
    const description = v.description.trim()
    try {
      if (!base.id) {
        base.id = (await create.mutateAsync({ payload: { name, description: description || null }, key })).id
        base.name = name
        base.description = description
        setPartial(true)
      } else if (name !== base.name || description !== base.description) {
        await update.mutateAsync({ id: base.id, changes: { name, description: description || null } })
        base.name = name
        base.description = description
      }
      if (!sameIds(v.members, base.members)) {
        await setMembers.mutateAsync({ id: base.id, userIds: v.members })
        base.members = v.members
      }
      allowLeave()
      toast.success(existing ? 'Team updated' : 'Team created')
      close()
    } catch (e) {
      setError(e as ApiError)
    } finally {
      setSaving(false)
    }
  }

  const cancel = async () => {
    if (isDirty && !(await confirmDialog('You have changes that are not saved. Close without saving?', { title: 'Discard changes?', confirmLabel: 'Discard' }))) return
    allowLeave()
    close()
  }

  const taken = error?.code === 'TEAM_EXISTS' ? error.message : undefined

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Team name" required autoComplete="off" maxLength={80} placeholder="e.g. Sales" error={errors.name?.message ?? taken} {...register('name')} />
      <Field label="Description (optional)" autoComplete="off" maxLength={300} placeholder="What this team looks after" error={errors.description?.message} {...register('description')} />
      <Controller control={control} name="members" render={({ field }) => <MemberPicker people={people} value={field.value} onChange={field.onChange} disabled={saving} />} />
      {errors.members?.message && <p role="alert" className="text-xs text-destructive">{errors.members.message}</p>}
      {inactive > 0 && <p className="text-xs text-muted">{inactive} inactive {inactive === 1 ? 'person is' : 'people are'} not shown here and will not be given new items.</p>}
      {error && !taken && error.code !== 'VALIDATION_ERROR' && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {partial && !existing ? `The team was created, but its members could not be saved: ${error.message} Try saving again.` : error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={cancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{saving ? 'Saving…' : existing || partial ? 'Save changes' : 'Create team'}</Button>
      </div>
    </form>
  )
}

function EditLoader({ team, people, close }: { team: Team; people: Person[]; close: () => void }) {
  const detail = useTeam(team.id)
  if (detail.isPending) return <p className="py-6 text-sm text-muted">Loading the team…</p>
  if (detail.isError)
    return (
      <div role="alert" className="space-y-3">
        <p className="text-sm text-destructive">{detail.error.message}</p>
        <Button variant="ghost" onClick={() => detail.refetch()}>Try again</Button>
      </div>
    )
  return <TeamForm existing={detail.data} people={people} close={close} />
}

// Create a team, or edit its name, description and members. Mounted only while open.
export function TeamDialog({ team, people, onClose }: { team: Team | null; people: Person[]; onClose: () => void }) {
  return <DialogShell title={team ? 'Edit team' : 'New team'} onClose={onClose}>{(close) => (team ? <EditLoader team={team} people={people} close={close} /> : <TeamForm people={people} close={close} />)}</DialogShell>
}
