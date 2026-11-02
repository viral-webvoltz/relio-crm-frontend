import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { DocumentsPanel } from '@/features/documents/components/DocumentsPanel'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { RecordActivity } from '@/features/activities/components/RecordActivity'
import { useCompany, useSaveCompany } from '../hooks/useCompanies'
import { companyFormSchema, emptyCompany, type CompanyFormValues } from '../schemas/companySchema'

export function CompanyFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: company, isPending, isError, error } = useCompany(id)
  const save = useSaveCompany(id)

  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: emptyCompany,
    values: company && { ...emptyCompany, ...Object.fromEntries(Object.entries(company).map(([k, v]) => [k, v ?? ''])) },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)

  if (id && isPending) return <PageSkeleton />
  if (id && isError) return <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.message}</p>

  const onSubmit = (values: CompanyFormValues) =>
    save.mutate(values, {
      onSuccess: () => {
        toast.success(id ? 'Company updated' : 'Company created')
        allowLeave()
        navigate('/companies')
      },
    })

  return (
    <>
      <PageHeader title={id ? 'Edit company' : 'New company'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-7">
        <Field label="Name" required error={errors.name?.message} {...register('name')} />
        <Field label="Industry" error={errors.industry?.message} {...register('industry')} />
        <Field label="Website" type="url" inputMode="url" hint="e.g. https://example.com" error={errors.website?.message} {...register('website')} />
        <Field label="Phone" type="tel" autoComplete="off" error={errors.phone?.message} {...register('phone')} />
        <Field label="Notes" error={errors.notes?.message} {...register('notes')} />
        {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          <Link to="/companies" className="btn-ghost">Cancel</Link>
        </div>
      </form>
      {id && <RecordActivity relatedType="company" relatedId={id} />}
      {id && <DocumentsPanel entityType="company" entityId={id} />}
    </>
  )
}
