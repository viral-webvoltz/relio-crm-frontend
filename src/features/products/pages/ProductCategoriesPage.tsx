import { ErrorState } from '@/components/ui/Skeleton'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { useCategories, useCreateCategory, useDeleteCategory, useRenameCategory } from '../hooks/useProducts'
import type { ProductCategory } from '../types'

function CategoryRow({ category }: { category: ProductCategory }) {
  const [isEditing, setIsEditing] = useState(false)
  const rename = useRenameCategory()
  const remove = useDeleteCategory()

  if (isEditing) {
    return (
      <li>
        <form
          className="flex gap-2 py-2"
          onSubmit={(event) => {
            event.preventDefault()
            const name = String(new FormData(event.currentTarget).get('name') ?? '').trim()
            if (!name) return
            rename.mutate({ id: category.id, name }, { onSuccess: () => setIsEditing(false), onError: (e) => toast.error(e.message) })
          }}
        >
          <input name="name" defaultValue={category.name} aria-label="Category name" className="input-base" maxLength={100} autoFocus />
          <Button type="submit" loading={rename.isPending}>Save</Button>
          <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between py-3">
      <span className="text-heading">{category.name}</span>
      <span>
        <button type="button" className="link-action" onClick={() => setIsEditing(true)}>Rename</button>
        <button
          type="button"
          className="link-danger"
          onClick={async () =>
            (await confirmDialog(`Delete "${category.name}"? Its products are kept, just uncategorised.`)) &&
            remove.mutate(category.id, { onSuccess: () => toast.success('Category deleted'), onError: (e) => toast.error(e.message) })
          }
        >
          Delete
        </button>
      </span>
    </li>
  )
}

export function ProductCategoriesPage() {
  const { data, isPending, isError, error, refetch } = useCategories()
  const create = useCreateCategory()

  return (
    <>
      <PageHeader title="Product categories" subtitle="Group your catalogue." actions={<Link to="/products" className="btn-ghost">Back to products</Link>} />
      <div className="card max-w-xl p-6">
        <form
          className="mb-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            const name = String(new FormData(form).get('name') ?? '').trim()
            if (!name) return
            create.mutate(name, { onSuccess: () => form.reset(), onError: (e) => toast.error(e.message) })
          }}
        >
          <input name="name" placeholder="New category name" aria-label="New category name" className="input-base" maxLength={100} />
          <Button type="submit" loading={create.isPending}>Add</Button>
        </form>
        {isPending ? (
          <p className="text-sm text-muted">Loading categories…</p>
        ) : isError ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.map((category) => <CategoryRow key={category.id} category={category} />)}
          </ul>
        )}
      </div>
    </>
  )
}
