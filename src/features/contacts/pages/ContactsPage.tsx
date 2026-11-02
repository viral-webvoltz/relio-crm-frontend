import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ListTools } from '@/components/layout/ListTools'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { useCan } from '@/features/auth/hooks/useCan'
import { useBatch, useUndoToast } from '@/lib/useBatch'
import { useListParams } from '@/lib/useListParams'
import { useRowSelection } from '@/lib/useRowSelection'
import { useContacts, useDeleteContact } from '../hooks/useContacts'
import type { Contact } from '../types'

const fullName = (contact: Contact) => [contact.firstName, contact.lastName].filter(Boolean).join(' ')

const columns: Column<Contact>[] = [
  {
    key: 'name',
    header: 'Name',
    sortKey: 'name',
    primary: true,
    cell: (contact) => (
      <div className="flex items-center gap-3">
        <Avatar name={fullName(contact)} />
        <span className="font-medium text-heading">{fullName(contact)}</span>
      </div>
    ),
  },
  { key: 'email', header: 'Email', sortKey: 'email', cell: (contact) => contact.email ?? '—' },
  { key: 'phone', header: 'Phone', cell: (contact) => contact.phone ?? '—' },
  { key: 'company', header: 'Company', sortKey: 'company', cell: (contact) => contact.companyName ?? '—' },
]

export function ContactsPage() {
  const { params, update } = useListParams(columns)
  const { data, isPending, isFetching, isError, error, refetch } = useContacts(params)
  const deleteContact = useDeleteContact()
  const canCreate = useCan('contacts.create')
  const canUpdate = useCan('contacts.update')
  const canDelete = useCan('contacts.delete')
  const { selected, setSelected } = useRowSelection(data?.data, (contact) => contact.id)
  const batch = useBatch('contacts', ['contact', 'contacts'], (id) => [data?.data.find((c) => c.id === id)?.firstName, data?.data.find((c) => c.id === id)?.lastName].filter(Boolean).join(' ') || id, '')
  const undoToast = useUndoToast()

  const handleDelete = async (contact: Contact) => {
    if (!(await confirmDialog(`Delete ${fullName(contact)}? This cannot be undone.`))) return
    deleteContact.mutate(contact.id, {
      onSuccess: () => undoToast('contacts', contact.id, 'Contact'),
      onError: (e) => toast.error(e.message),
    })
  }

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="People across all your companies."
        actions={
          canCreate && (
            <Link to="/contacts/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> New contact
            </Link>
          )
        }
      />
      <div className="mb-4">
        <SearchForm defaultValue={params.search} placeholder="Search name or email" onSearch={(search) => update({ search })} />
        <ListTools resource="contacts" importable="contacts" />
      </div>

      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
        ]}
        onClear={() => update({ search: '' })}
      />

      <DataTable
        caption="Contacts"
        columns={columns}
        columnsPref="contacts"
        rows={data?.data}
        rowKey={(contact) => contact.id}
        rowLabel={fullName}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{
          title: params.search ? 'No contacts match your search.' : 'No contacts yet.',
          hint: params.search ? 'Try a different search or clear the filters.' : 'Use the button above to add your first one.',
        }}
        sort={params}
        onSortChange={(sort, dir) => update({ sort, dir })}
        actions={(contact) => (
          <>
            {canUpdate && <Link to={`/contacts/${contact.id}/edit`} className="link-action">Edit</Link>}
            {canDelete && <button type="button" className="link-danger" onClick={() => handleDelete(contact)}>Delete</button>}
          </>
        )}
        selection={
          canDelete
            ? { selected, onChange: setSelected, noun: 'contacts', bulkActions: [{ label: 'Delete', danger: true, busy: batch.busy, run: (ids) => batch.run(ids, { action: 'delete' }) }] }
            : undefined
        }
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
