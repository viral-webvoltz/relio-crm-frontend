import { Select } from '@/components/ui/Select'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ListTools } from '@/components/layout/ListTools'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type BulkAction, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { useCan } from '@/features/auth/hooks/useCan'
import { formatMoney } from '@/lib/money'
import { useBatch, useUndoToast } from '@/lib/useBatch'
import { useListParams } from '@/lib/useListParams'
import { useRowSelection } from '@/lib/useRowSelection'
import { StockBadge } from '../components/StockBadge'
import { useCategories, useDeleteProduct, useProducts } from '../hooks/useProducts'
import type { Product } from '../types'

const columns: Column<Product>[] = [
  {
    key: 'product',
    header: 'Product',
    sortKey: 'name',
    primary: true,
    cell: (product) => (
      <>
        <div className="font-medium text-heading">{product.name}</div>
        {product.sku && <div className="text-xs text-muted">{product.sku}</div>}
      </>
    ),
  },
  { key: 'category', header: 'Category', sortKey: 'category', cell: (product) => product.categoryName ?? '—' },
  { key: 'price', header: 'Price', sortKey: 'price', cell: (product) => formatMoney(product.priceMinor, product.currency) },
  { key: 'stock', header: 'Stock', sortKey: 'stock', cell: (product) => <StockBadge product={product} /> },
  { key: 'status', header: 'Status', cell: (product) => <StatusBadge domain="active" status={product.isActive ? 'active' : 'inactive'} /> },
]


export function ProductsPage() {
  const { params, searchParams, update } = useListParams(columns)
  const categoryId = searchParams.get('category') ?? ''
  const status = searchParams.get('status') ?? ''
  const { data, isPending, isFetching, isError, error, refetch } = useProducts({ ...params, categoryId, status })
  const categories = useCategories()
  const deleteProduct = useDeleteProduct()
  const canCreate = useCan('products.create')
  const canUpdate = useCan('products.update')
  const canDelete = useCan('products.delete')
  const { selected, setSelected } = useRowSelection(data?.data, (product) => product.id)
  const batch = useBatch('products', ['product', 'products'], (id) => data?.data.find((p) => p.id === id)?.name ?? id, 'Their stock history is kept with them.')
  const undoToast = useUndoToast()
  const bulkActions: BulkAction[] = [
    ...(canUpdate
      ? [
          { label: 'Mark active', busy: batch.busy, run: (ids: string[]) => batch.run(ids, { action: 'update', changes: { isActive: true } }) },
          { label: 'Mark inactive', busy: batch.busy, run: (ids: string[]) => batch.run(ids, { action: 'update', changes: { isActive: false } }) },
        ]
      : []),
    ...(canDelete ? [{ label: 'Delete', danger: true, busy: batch.busy, run: (ids: string[]) => batch.run(ids, { action: 'delete' }) }] : []),
  ]
  const filtered = Boolean(params.search || categoryId || status)

  const handleDelete = async (product: Product) => {
    if (!(await confirmDialog(`Delete "${product.name}"? Its stock history is deleted too. Consider marking it inactive instead.`))) return
    deleteProduct.mutate(product.id, { onSuccess: () => undoToast('products', product.id, 'Product'), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Your catalogue, pricing and stock."
        actions={
          <div className="flex gap-2">
            {canUpdate && <Link to="/products/categories" className="btn-ghost">Categories</Link>}
            {canCreate && (
              <Link to="/products/new" className="btn-primary">
                <Plus className="size-4" aria-hidden /> New product
              </Link>
            )}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search name or SKU" onSearch={(search) => update({ search })} />
        <Select aria-label="Filter by category" value={categoryId} onChange={(e) => update({ category: e.target.value })} className="input-base w-auto">
          <option value="">All categories</option>
          {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} className="input-base w-auto">
          <option value="">Active and inactive</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <ListTools resource="products" importable="products" />
      </div>

      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
          categoryId && { label: `Category: ${categories.data?.find((c) => c.id === categoryId)?.name ?? 'selected'}`, onRemove: () => update({ category: '' }) },
          status && { label: `Status: ${status}`, onRemove: () => update({ status: '' }) },
        ]}
        onClear={() => update({ search: '', category: '', status: '' })}
      />

      <DataTable
        caption="Products"
        columns={columns}
        columnsPref="products"
        rows={data?.data}
        rowKey={(product) => product.id}
        rowLabel={(product) => product.name}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{
          title: filtered ? 'No products match your filters.' : 'No products yet.',
          hint: filtered ? 'Try a different search or clear the filters.' : 'Use the button above to add your first one.',
        }}
        sort={params}
        onSortChange={(sort, dir) => update({ sort, dir })}
        actions={(product) => (
          <>
            <Link to={`/products/${product.id}/edit`} className="link-action">{canUpdate ? 'Edit' : 'View'}</Link>
            {canDelete && <button type="button" className="link-danger" onClick={() => handleDelete(product)}>Delete</button>}
          </>
        )}
        selection={bulkActions.length > 0 ? { selected, onChange: setSelected, noun: 'products', bulkActions } : undefined}
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
