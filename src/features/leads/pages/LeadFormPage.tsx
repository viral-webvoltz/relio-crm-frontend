import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { DocumentsPanel } from '@/features/documents/components/DocumentsPanel'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FormSection } from '@/components/ui/FormSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { UserSelect } from '@/components/entity/EntitySelects'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { RecordActivity } from '@/features/activities/components/RecordActivity'
import { RecordEmails } from '@/features/record-emails/components/RecordEmails'
import { useCan } from '@/features/auth/hooks/useCan'
import { CustomFieldsSection } from '@/features/custom-fields/components/CustomFieldsSection'
import { useCustomFieldDefinitions } from '@/features/custom-fields/hooks/useCustomFields'
import { prepareCustomFields, toFormCustomFields, useCustomFieldErrors } from '@/features/custom-fields/values'
import { useLead, useSaveLead } from '../hooks/useLeads'
import { emptyLead, leadFormSchema, type LeadFormValues } from '../schemas/leadSchema'
import { leadPriorities, leadSources, leadStatuses } from '../types'

export function LeadFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: lead, isPending, isError, error } = useLead(id)
  const save = useSaveLead(id)
  const canAssign = useCan('leads.assign')
  const { data: definitions } = useCustomFieldDefinitions('lead')

  const { register, control, handleSubmit, setError, formState: { errors, isDirty } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: emptyLead,
    values: lead && { ...emptyLead, ...Object.fromEntries(Object.entries(lead).map(([k, v]) => [k, v == null ? '' : String(v)])), customFields: toFormCustomFields(lead.customFields) },
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)
  useCustomFieldErrors(save.error, setError)

  if (id && isPending) return <PageSkeleton />
  if (id && isError) return <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error.message}</p>

  const onSubmit = (values: LeadFormValues) => {
    const customFields = prepareCustomFields(definitions, values.customFields, setError)
    if (!customFields) return
    save.mutate({ ...values, customFields, canAssign }, {
      onSuccess: () => {
        toast.success(id ? 'Lead updated' : 'Lead created')
        allowLeave()
        navigate('/leads')
      },
    })
  }

  return (
    <>
      <PageHeader title={id ? 'Edit lead' : 'New lead'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-7">
        <FormSection title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required error={errors.firstName?.message} {...register('firstName')} />
            <Field label="Last name" error={errors.lastName?.message} {...register('lastName')} />
          </div>
        </FormSection>
        <FormSection title="Contact details">
          <Field label="Email" autoComplete="off" type="email" error={errors.email?.message} {...register('email')} />
          <Field label="Phone" type="tel" autoComplete="off" error={errors.phone?.message} {...register('phone')} />
          <Field label="Company name" error={errors.companyName?.message} {...register('companyName')} />
        </FormSection>
        <FormSection title="Pipeline">
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Source" {...register('source')}>
              {leadSources.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
            <SelectField label="Status" {...register('status')}>
              {leadStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
            <SelectField label="Priority" {...register('priority')}>
              {leadPriorities.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Score (0–100)" hint="Higher means a warmer lead" inputMode="numeric" error={errors.score?.message} {...register('score')} />
            <Field label="Follow-up date" type="date" error={errors.followUpDate?.message} {...register('followUpDate')} />
          </div>
          {canAssign && (
            <UserSelect control={control} name="assignedTo" />
          )}
        </FormSection>
        <FormSection title="Notes">
          <Field label="Notes" error={errors.notes?.message} {...register('notes')} />
        </FormSection>
        <CustomFieldsSection entity="lead" register={register} errors={errors} />
        {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          <Link to="/leads" className="btn-ghost">Cancel</Link>
        </div>
      </form>
      {id && <RecordEmails entity="lead" entityId={id} email={lead?.email} />}
      {id && <RecordActivity relatedType="lead" relatedId={id} />}
      {id && <DocumentsPanel entityType="lead" entityId={id} />}
    </>
  )
}
