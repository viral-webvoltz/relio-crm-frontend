import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { CompanySelect } from '@/components/entity/EntitySelects'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { SelectField } from '@/components/ui/SelectField'
import { getTags } from '@/features/tags/api/tagsApi'
import { httpClient } from '@/lib/httpClient'
import type { CampaignFormValues } from '../schemas/campaignSchema'

type Contact = { id: string; firstName: string; lastName?: string | null }
const contactName = (c: Contact) => [c.firstName, c.lastName].filter(Boolean).join(' ')

const searchContacts = async (search: string, signal: AbortSignal): Promise<ComboOption[]> => {
  const { data } = await httpClient.get<{ data: Contact[] }>('/contacts', { params: { page: 1, limit: 20, search: search || undefined }, signal })
  return data.data.map((c) => ({ id: c.id, label: contactName(c) }))
}

// The tag list is short, so it is filtered here rather than on the server.
const searchTags = async (search: string): Promise<ComboOption[]> => {
  const q = search.trim().toLowerCase()
  return (await getTags()).filter((t) => t.name.toLowerCase().includes(q)).map((t) => ({ id: t.id, label: t.name }))
}
const oneTag = async (id: string): Promise<ComboOption> => {
  const tag = (await getTags()).find((t) => t.id === id)
  return { id, label: tag?.name ?? 'Unknown tag' }
}

function ContactChip({ id, onRemove }: { id: string; onRemove: () => void }) {
  const person = useQuery({ queryKey: ['contact-name', id], queryFn: async ({ signal }) => contactName((await httpClient.get<{ data: Contact }>(`/contacts/${id}`, { signal })).data.data), staleTime: Infinity, retry: false })
  const name = person.data ?? (person.isError ? 'Unavailable contact' : 'Loading…')
  return (
    <li className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-xs font-medium text-primary">
      {name}
      <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="grid size-6 place-items-center rounded-full hover:bg-primary/10">
        <X className="size-3.5" aria-hidden />
      </button>
    </li>
  )
}

// Plain-language audience: everyone, a tag, a company, or hand-picked people.
export function AudienceFields({ form }: { form: UseFormReturn<CampaignFormValues> }) {
  const { register, control, watch, formState: { errors } } = form
  const type = watch('audienceType')
  return (
    <div className="space-y-4">
      <SelectField label="Send it to" required {...register('audienceType')}>
        <option value="all">Everyone with an email address</option>
        <option value="tag">People with a tag</option>
        <option value="company">People at one company</option>
        <option value="contacts">People I choose</option>
      </SelectField>
      {type === 'tag' && (
        <Controller control={control} name="tagId" render={({ field }) => <Combobox label="Tag" required scope="tags" value={field.value} onChange={field.onChange} fetchOptions={searchTags} fetchOne={oneTag} emptyLabel="Choose a tag" error={errors.tagId?.message} />} />
      )}
      {type === 'company' && <CompanySelect control={control} name="companyId" label="Company" required emptyLabel="Choose a company" error={errors.companyId?.message} />}
      {type === 'contacts' && (
        <Controller
          control={control}
          name="contactIds"
          render={({ field }) => (
            <div className="space-y-2">
              <Combobox label="Add a person" scope="contacts" value="" onChange={(id) => id && !field.value.includes(id) && field.onChange([...field.value, id])} fetchOptions={searchContacts} emptyLabel="Search by name…" error={errors.contactIds?.message} hint="Up to 1,000 people. For more, use a tag." />
              {field.value.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="People chosen">
                  {field.value.map((id) => (
                    <ContactChip key={id} id={id} onRemove={() => field.onChange(field.value.filter((x) => x !== id))} />
                  ))}
                </ul>
              )}
            </div>
          )}
        />
      )}
    </div>
  )
}
