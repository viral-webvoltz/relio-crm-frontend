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
import { useCompanies, useDeleteCompany } from '../hooks/useCompanies'
import type { Company } from '../types'

const columns: Column<Company>[] = [
  {
    key: 'name',
    header: 'Name',
    sortKey: 'name',
    primary: true,
    cell: (company) => (
      <div className="flex items-center gap-3">
        <Avatar name={company.name} />
        <span className="font-medium text-heading">{company.name}</span>
      </div>
    ),
  },
  { key: 'industry', header: 'Industry', sortKey: 'industry', cell: (company) => company.industry ?? '—' },
  { key: 'website', header: 'Website', cell: (company) => company.website ?? '—' },
  { key: 'phone', header: 'Phone', cell: (company) => company.phone ?? '—' },
]

export function CompaniesPage() {
  const { params, update } = useListParams(columns)
  const { data, isPending, isFetching, isError, error, refetch } = useCompanies(params)
  const deleteCompany = useDeleteCompany()
  const canCreate = useCan('companies.create')
  const canUpdate = useCan('companies.update')
  const canDelete = useCan('companies.delete')
  const { selected, setSelected } = useRowSelection(data?.data, (company) => company.id)
  const batch = useBatch('companies', ['company', 'companies'], (id) => data?.data.find((c) => c.id === id)?.name ?? id, 'Their contacts will be kept but unlinked.')
  const undoToast = useUndoToast()

  const handleDelete = async (company: Company) => {
    if (!(await confirmDialog(`Delete ${company.name}? Its contacts will be kept but unlinked. It moves to the trash and can be restored.`))) return
    deleteCompany.mutate(company.id, {
      onSuccess: () => undoToast('companies', company.id, 'Company'),
      onError: (e) => toast.error(e.message),
    })
  }

  return (
    <>
      <PageHeader
        title="Companies"
        subtitle="Organizations you sell to and work with."
        actions={
          canCreate && (
            <Link to="/companies/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> New company
            </Link>
          )
        }
      />
      <div className="mb-4">
        <SearchForm defaultValue={params.search} placeholder="Search companies" onSearch={(search) => update({ search })} />
        <ListTools resource="companies" importable="companies" />
      </div>

      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
        ]}
        onClear={() => update({ search: '' })}
      />

      <DataTable
        caption="Companies"
        columns={columns}
        columnsPref="companies"
        rows={data?.data}
        rowKey={(company) => company.id}
        rowLabel={(company) => company.name}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{
          title: params.search ? 'No companies match your search.' : 'No companies yet.',
          hint: params.search ? 'Try a different search or clear the filters.' : 'Use the button above to add your first one.',
        }}
        sort={params}
        onSortChange={(sort, dir) => update({ sort, dir })}
        actions={(company) => (
          <>
            {canUpdate && <Link to={`/companies/${company.id}/edit`} className="link-action">Edit</Link>}
            {canDelete && <button type="button" className="link-danger" onClick={() => handleDelete(company)}>Delete</button>}
          </>
        )}
        selection={
          canDelete
            ? { selected, onChange: setSelected, noun: 'companies', bulkActions: [{ label: 'Delete', danger: true, busy: batch.busy, run: (ids) => batch.run(ids, { action: 'delete' }) }] }
            : undefined
        }
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
