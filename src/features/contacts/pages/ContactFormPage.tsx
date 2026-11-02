import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { DocumentsPanel } from '@/features/documents/components/DocumentsPanel'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FormSection } from '@/components/ui/FormSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { CompanySelect } from '@/components/entity/EntitySelects'
import { Field } from '@/components/ui/Field'
import { RecordActivity } from '@/features/activities/components/RecordActivity'
import { RecordEmails } from '@/features/record-emails/components/RecordEmails'
import { TimelinePanel } from '@/features/timeline/components/TimelinePanel'
import { ContactDocumentsPanel } from '@/features/portal-admin/components/ContactDocumentsPanel'
import { PortalAccessPanel } from '@/features/customers/components/PortalAccessPanel'
import { CustomFieldsSection } from '@/features/custom-fields/components/CustomFieldsSection'
import { useCustomFieldDefinitions } from '@/features/custom-fields/hooks/useCustomFields'
import { prepareCustomFields, toFormCustomFields, useCustomFieldErrors } from '@/features/custom-fields/values'
import { TagPicker } from '@/features/tags/components/TagPicker'
import { useContactTags, useSetContactTags } from '@/features/tags/hooks/useTags'
import { useContact, useSaveContact } from '../hooks/useContacts'
import { contactFormSchema, emptyContact, type ContactFormValues } from '../schemas/contactSchema'

export function ContactFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: contact, isPending, error } = useContact(id)
  const save = useSaveContact(id)
  const { data: definitions } = useCustomFieldDefinitions('contact')
  const contactTags = useContactTags(id)
  const setTags = useSetContactTags()

  const { register, control, handleSubmit, setError, formState: { errors, isDirty, dirtyFields } } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: emptyContact,
    // The form is filled once, when the contact and its tags have both arrived, so late data never overwrites typing.
    values: contact && (contactTags.data || !id)
      ? { ...emptyContact, ...Object.fromEntries(Object.entries(contact).map(([k, v]) => [k, v ?? ''])), customFields: toFormCustomFields(contact.customFields), tagIds: contactTags.data?.map((t) => t.id) ?? [] }
      : undefined,
  })
  const { allowLeave } = useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)
  useCustomFieldErrors(save.error, setError)

  if (id && (isPending || contactTags.isPending)) return <PageSkeleton />
  const loadError = error ?? contactTags.error
  if (id && loadError) return <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{loadError.message}</p>

  const onSubmit = (values: ContactFormValues) => {
    const customFields = prepareCustomFields(definitions, values.customFields, setError)
    if (!customFields) return
    save.mutate({ ...values, customFields }, {
      onSuccess: async (response) => {
        // Tags have their own endpoint, so they are saved right after the contact, and only when they changed.
        const contactId = id ?? (response as { data?: { data?: { id?: string } } })?.data?.data?.id
        let tagsSaved = true
        if (contactId && (id ? dirtyFields.tagIds : values.tagIds.length > 0)) {
          tagsSaved = await setTags.mutateAsync({ contactId, tagIds: values.tagIds }).then(() => true, () => false)
        }
        allowLeave()
        if (tagsSaved) toast.success(id ? 'Contact updated' : 'Contact created')
        else toast.warning('The contact was saved, but its tags could not be updated. Open the contact again to retry.')
        navigate('/contacts')
      },
    })
  }

  return (
    <>
      <PageHeader title={id ? 'Edit contact' : 'New contact'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-7">
        <FormSection title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required error={errors.firstName?.message} {...register('firstName')} />
            <Field label="Last name" error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <Field label="Job title" error={errors.jobTitle?.message} {...register('jobTitle')} />
        </FormSection>
        <FormSection title="Contact details">
          <Field label="Email" autoComplete="off" type="email" error={errors.email?.message} {...register('email')} />
          <Field label="Phone" type="tel" autoComplete="off" error={errors.phone?.message} {...register('phone')} />
        </FormSection>
        <FormSection title="Relationship">
          <CompanySelect control={control} name="companyId" error={errors.companyId?.message} />
          <Controller control={control} name="tagIds" render={({ field }) => <TagPicker value={field.value} onChange={field.onChange} error={errors.tagIds?.message} />} />
          <Field label="Notes" error={errors.notes?.message} {...register('notes')} />
        </FormSection>
        <CustomFieldsSection entity="contact" register={register} errors={errors} />
        {save.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{save.error.message}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending || setTags.isPending}>{save.isPending || setTags.isPending ? 'Saving…' : 'Save'}</Button>
          <Link to="/contacts" className="btn-ghost">Cancel</Link>
        </div>
      </form>
      {id && <PortalAccessPanel contactId={id} defaultEmail={contact?.email ?? ''} />}
      {id && <ContactDocumentsPanel contactId={id} />}
      {id && <RecordEmails entity="contact" entityId={id} email={contact?.email} />}
      {id && <RecordActivity relatedType="contact" relatedId={id} />}
      {id && <TimelinePanel entity="contact" entityId={id} />}
      {id && <DocumentsPanel entityType="contact" entityId={id} />}
    </>
  )
}
