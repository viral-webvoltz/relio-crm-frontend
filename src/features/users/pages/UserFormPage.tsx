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
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { useRoles } from '@/features/roles/hooks/useRoles'
import { useCreateUser, useUpdateUser, useUsers } from '../hooks/useUsers'
import { createUserFormSchema, editUserFormSchema, type CreateUserFormValues, type EditUserFormValues } from '../schemas/userSchema'

type FormValues = CreateUserFormValues & { isActive: boolean }

export function UserFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: me } = useCurrentUser()
  const users = useUsers()
  const roles = useRoles()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser(id ?? '')
  const user = users.data?.find((u) => u.id === id)
  const save = id ? updateUser : createUser

  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(id ? editUserFormSchema : createUserFormSchema) as never,
    defaultValues: { fullName: '', email: '', password: '', roleIds: [], isActive: true },
    values: user && { fullName: user.fullName, email: user.email, password: '', roleIds: user.roles.map((r) => r.id), isActive: user.isActive },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  if (users.isPending || roles.isPending) return <PageSkeleton />
  if (users.isError || roles.isError) return <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{(users.error ?? roles.error)?.message}</p>
  if (id && !user) return <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">User not found</p>

  const onSubmit = (values: FormValues) => {
    const done = {
      onSuccess: () => {
        toast.success(id ? 'User updated' : 'User created')
        allowLeave()
        navigate('/settings/users')
      },
    }
    if (id) updateUser.mutate(values as EditUserFormValues, done)
    else createUser.mutate(values, done)
  }

  return (
    <>
      <PageHeader title={id ? 'Edit user' : 'New user'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-7">
        <Field label="Full name" required autoComplete="off" error={errors.fullName?.message} {...register('fullName')} />
        <Field label="Email" type="email" required={!id} autoComplete="off" disabled={Boolean(id)} error={errors.email?.message} {...register('email')} />
        <Field
          label={id ? 'New password (leave blank to keep)' : 'Initial password'}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-heading">Roles</legend>
          <div className="space-y-2">
            {roles.data.roles.map((role) => (
              <Checkbox key={role.id} label={role.name} value={role.id} {...register('roleIds')} />
            ))}
          </div>
          {errors.roleIds && <p role="alert" className="mt-1 text-xs text-destructive">{errors.roleIds.message}</p>}
        </fieldset>
        {id && <Checkbox label="Active" disabled={id === me?.id} {...register('isActive')} />}
        {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          <Link to="/settings/users" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </>
  )
}
