import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { httpClient } from '@/lib/httpClient'

type Person = { id: string; firstName: string; lastName?: string | null }
type Named = { id: string; name: string }

const fullName = (p: Person) => [p.firstName, p.lastName].filter(Boolean).join(' ')

const company = (c: Named): ComboOption => ({ id: c.id, label: c.name })
const contact = (c: Person): ComboOption => ({ id: c.id, label: fullName(c) })

const list = <T,>(path: string, map: (item: T) => ComboOption) => async (search: string, signal: AbortSignal) => {
  const { data } = await httpClient.get<{ data: T[] }>(path, { params: { page: 1, limit: 20, search: search || undefined }, signal })
  return data.data.map(map)
}
const one = <T,>(path: string, map: (item: T) => ComboOption) => async (id: string, signal: AbortSignal) => {
  const { data } = await httpClient.get<{ data: T }>(`${path}/${id}`, { signal })
  return map(data.data)
}

type SelectProps<T extends FieldValues> = {
  control: Control<T>
  name: Path<T>
  label?: string
  error?: string
  hint?: string
  required?: boolean
  emptyLabel?: string
}

// One searchable selector per entity: server-side search, no 100-item cap, label resolved for the saved value.
function entitySelect(scope: string, defaults: { label: string; emptyLabel: string }, fetchOptions: Parameters<typeof Combobox>[0]['fetchOptions'], fetchOne?: Parameters<typeof Combobox>[0]['fetchOne']) {
  return function EntitySelect<T extends FieldValues>({ control, name, label = defaults.label, emptyLabel = defaults.emptyLabel, ...rest }: SelectProps<T>) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Combobox label={label} scope={scope} emptyLabel={emptyLabel} value={field.value ?? ''} onChange={field.onChange} fetchOptions={fetchOptions} fetchOne={fetchOne} {...rest} />
        )}
      />
    )
  }
}

export const CompanySelect = entitySelect('companies', { label: 'Company', emptyLabel: 'No company' }, list<Named>('/companies', company), one<Named>('/companies', company))
export const ContactSelect = entitySelect('contacts', { label: 'Contact', emptyLabel: 'No contact' }, list<Person>('/contacts', contact), one<Person>('/contacts', contact))

type UserOption = { id: string; fullName: string }
// The user list is small and already served by /users/options, so it is filtered here instead of on the server.
export const UserSelect = entitySelect(
  'users',
  { label: 'Assigned to', emptyLabel: 'Unassigned' },
  async (search, signal) => {
    const { data } = await httpClient.get<{ data: UserOption[] }>('/users/options', { signal })
    const q = search.trim().toLowerCase()
    return data.data.filter((u) => u.fullName.toLowerCase().includes(q)).map((u) => ({ id: u.id, label: u.fullName }))
  },
  async (id, signal) => {
    const { data } = await httpClient.get<{ data: UserOption[] }>('/users/options', { signal })
    const u = data.data.find((x) => x.id === id)
    return { id, label: u?.fullName ?? 'Unknown user' }
  },
)
