import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { DocumentsPanel } from '@/features/documents/components/DocumentsPanel'
import { useCan } from '@/features/auth/hooks/useCan'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { CompanySelect, ContactSelect } from '@/components/entity/EntitySelects'
import { Field } from '@/components/ui/Field'
import { RecordActivity } from '@/features/activities/components/RecordActivity'
import { toMajor } from '@/lib/money'
import { CustomFieldsSection } from '@/features/custom-fields/components/CustomFieldsSection'
import { useCustomFieldDefinitions } from '@/features/custom-fields/hooks/useCustomFields'
import { prepareCustomFields, toFormCustomFields, useCustomFieldErrors } from '@/features/custom-fields/values'
import { CommentsPanel } from '@/features/comments/components/CommentsPanel'
import { useDeal, useSaveDeal } from '../hooks/useDeals'
import { dealFormSchema, emptyDeal, type DealFormValues } from '../schemas/dealSchema'

export function DealFormPage() {
  const { id } = useParams()
  const canQuote = useCan('quotes.create')
  const navigate = useNavigate()
  const { data: deal, isPending, isError, error } = useDeal(id)
  const save = useSaveDeal(id)
  const { data: definitions } = useCustomFieldDefinitions('deal')

  const { register, control, handleSubmit, setError, formState: { errors, isDirty } } = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: emptyDeal,
    values: deal && {
      title: deal.title,
      value: toMajor(deal.valueMinor),
      currency: deal.currency,
      expectedCloseDate: deal.expectedCloseDate ?? '',
      contactId: deal.contactId ?? '',
      companyId: deal.companyId ?? '',
      customFields: toFormCustomFields(deal.customFields),
    },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)
  useCustomFieldErrors(save.error, setError)

  if (id && isPending) return <PageSkeleton />
  if (id && isError) return <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.message}</p>

  const onSubmit = (values: DealFormValues) => {
    const customFields = prepareCustomFields(definitions, values.customFields, setError)
    if (!customFields) return
    save.mutate({ ...values, customFields }, {
      onSuccess: () => {
        toast.success(id ? 'Deal updated' : 'Deal created')
        allowLeave()
        navigate('/deals')
      },
    })
  }

  return (
    <>
      <PageHeader
        title={id ? 'Edit deal' : 'New deal'}
        actions={id && canQuote && <Link to={`/quotes/new?dealId=${id}`} className="btn-ghost">New quote for this deal</Link>}
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-7">
        <Field label="Title" required error={errors.title?.message} {...register('title')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Value" required inputMode="decimal" error={errors.value?.message} {...register('value')} />
          <Field label="Currency" required hint="3-letter code, e.g. USD" autoCapitalize="characters" maxLength={3} error={errors.currency?.message} {...register('currency')} />
        </div>
        <Field label="Expected close date" type="date" error={errors.expectedCloseDate?.message} {...register('expectedCloseDate')} />
        <ContactSelect control={control} name="contactId" />
        <CompanySelect control={control} name="companyId" />
        <CustomFieldsSection entity="deal" register={register} errors={errors} />
        {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          <Link to="/deals" className="btn-ghost">Cancel</Link>
        </div>
      </form>
      {id && <RecordActivity relatedType="deal" relatedId={id} />}
      {id && <CommentsPanel entity="deal" entityId={id} title="Team discussion" />}
      {id && <DocumentsPanel entityType="deal" entityId={id} />}
    </>
  )
}
