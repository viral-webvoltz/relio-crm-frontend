import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { useRoles, useSaveRole } from '../hooks/useRoles'
import { roleFormSchema, type RoleFormValues } from '../schemas/roleSchema'

// "contacts.view" -> group "contacts", action "view"
function groupPermissions(keys: string[]) {
  const groups = new Map<string, string[]>()
  for (const key of keys) {
    const group = key.split('.')[0]!
    groups.set(group, [...(groups.get(group) ?? []), key])
  }
  return [...groups.entries()]
}

export function RoleFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isPending, isError, error } = useRoles()
  const save = useSaveRole(id)
  const role = data?.roles.find((r) => r.id === id)

  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', permissions: [] },
    values: role && { name: role.name, permissions: role.permissions },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  if (isPending) return <PageSkeleton />
  if (isError) return <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.message}</p>
  if (id && !role) return <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">Role not found</p>
  if (role?.isSystem) return <p className="text-sm text-muted">The owner role always has full access and cannot be edited.</p>

  const onSubmit = (values: RoleFormValues) =>
    save.mutate(values, {
      onSuccess: () => {
        toast.success(id ? 'Role updated' : 'Role created')
        allowLeave()
        navigate('/settings/roles')
      },
    })

  return (
    <>
      <PageHeader title={id ? 'Edit role' : 'New role'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6 p-7">
        <Field label="Role name" required error={errors.name?.message} {...register('name')} />
        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-medium text-heading">Permissions</legend>
          {groupPermissions(data.allPermissions).map(([group, keys]) => (
            <div key={group}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{group}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {keys.map((key) => (
                  <Checkbox key={key} label={key.split('.')[1]!} value={key} {...register('permissions')} />
                ))}
              </div>
            </div>
          ))}
        </fieldset>
        {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          <Link to="/settings/roles" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}
