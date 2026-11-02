import { ArrowDown, ArrowUp, ArrowUpDown, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { ColumnsMenu } from '@/components/ui/ColumnsMenu'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Skeleton'
import type { PageMeta, SortDir } from '@/lib/apiTypes'
import { usePreferences, useSetPreference } from '@/lib/usePreferences'
import { cn } from '@/lib/utils'

export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Server-side sort field. Makes the header a sort button. */
  sortKey?: string
  /** The main column: becomes the card title on small screens. */
  primary?: boolean
  align?: 'right'
}

export type BulkAction = { label: string; danger?: boolean; busy?: boolean; run: (ids: string[]) => void }

type DataTableProps<T> = {
  caption: string
  columns: Column<T>[]
  /** Lets users show/hide columns; remembered per user under this list name (e.g. "leads"). */
  columnsPref?: string
  rows: T[] | undefined
  rowKey: (row: T) => string
  /** Accessible name for a row's checkbox, e.g. the person's name. */
  rowLabel?: (row: T) => string
  /** Buttons/links shown at the end of each row (and card). */
  actions?: (row: T) => ReactNode
  loading: boolean
  /** True while refetching with old rows still on screen (sort, page, filter changes). */
  refreshing?: boolean
  error?: { message: string } | null
  onRetry?: () => void
  empty: { title: string; hint?: string; icon?: LucideIcon }
  sort?: { sort?: string; dir?: SortDir }
  onSortChange?: (sort: string | undefined, dir: SortDir | undefined) => void
  /** Pass to make rows selectable. Clicking a row toggles it unless the click is on a link, button or other control. */
  selection?: { selected: ReadonlySet<string>; onChange: (next: ReadonlySet<string>) => void; bulkActions?: BulkAction[]; noun: string /* plural, e.g. "companies" */ }
  meta?: PageMeta
  onPageChange?: (page: number) => void
  onPageSizeChange?: (limit: number) => void
}

const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [data-no-select]'

export function DataTable<T>({
  caption, columns: allColumns, columnsPref, rows, rowKey, rowLabel, actions, loading, refreshing, error, onRetry, empty,
  sort, onSortChange, selection, meta, onPageChange, onPageSizeChange,
}: DataTableProps<T>) {
  const selectAll = useRef<HTMLInputElement>(null)
  const ids = (rows ?? []).map(rowKey)
  const selectedCount = selection ? ids.filter((id) => selection.selected.has(id)).length : 0
  const allSelected = ids.length > 0 && selectedCount === ids.length
  const { data: prefs } = usePreferences()
  const setPreference = useSetPreference()
  const saved = columnsPref ? prefs?.[`columns.${columnsPref}`] : undefined
  const savedKeys = Array.isArray(saved) ? new Set(saved.map(String)) : null
  const mainKey = (allColumns.find((c) => c.primary) ?? allColumns[0]!).key
  // Show everything until the user chooses; the main column is always shown.
  const columns = savedKeys ? allColumns.filter((c) => c.key === mainKey || savedKeys.has(c.key)) : allColumns
  const primary = columns.find((c) => c.primary) ?? columns[0]!
  const menuItems = allColumns.filter((c) => c.header).map((c) => ({ key: c.key, header: c.header, locked: c.key === mainKey }))

  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selectedCount > 0 && !allSelected
  }, [selectedCount, allSelected])

  const toggle = (id: string) => {
    if (!selection) return
    const next = new Set(selection.selected)
    if (!next.delete(id)) next.add(id)
    selection.onChange(next)
  }
  const toggleAll = () => selection?.onChange(allSelected ? new Set() : new Set(ids))

  // Row click selects, except on controls inside the row and while the user is highlighting text.
  const onRowClick = (id: string) => (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest(INTERACTIVE) || window.getSelection()?.toString()) return
    toggle(id)
  }

  // Cycle: ascending → descending → back to the default order.
  const cycleSort = (key: string) => {
    if (sort?.sort !== key) onSortChange?.(key, 'asc')
    else if (sort.dir === 'asc') onSortChange?.(key, 'desc')
    else onSortChange?.(undefined, undefined)
  }

  const header = (column: Column<T>) => {
    const active = column.sortKey !== undefined && sort?.sort === column.sortKey
    const ariaSort = active ? (sort?.dir === 'desc' ? 'descending' : 'ascending') : column.sortKey ? 'none' : undefined
    const Icon = !active ? ArrowUpDown : sort?.dir === 'desc' ? ArrowDown : ArrowUp
    return (
      <th key={column.key} scope="col" aria-sort={ariaSort} className={cn('px-5 py-3 font-medium', column.align === 'right' && 'text-right')}>
        {column.sortKey && onSortChange ? (
          <button
            type="button"
            onClick={() => cycleSort(column.sortKey!)}
            className={cn('-mx-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 uppercase tracking-wide transition hover:bg-surface hover:text-heading', active && 'text-heading')}
          >
            {column.header}
            <Icon className={cn('size-3.5', !active && 'opacity-50')} aria-hidden />
          </button>
        ) : (
          column.header
        )}
      </th>
    )
  }

  let body: ReactNode
  if (loading) body = <TableSkeleton />
  else if (error) body = <ErrorState message={error.message} onRetry={onRetry} />
  else if (!rows || rows.length === 0) body = <EmptyState {...empty} />
  else {
    body = (
      <>
        {/* md and up: a real table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-background/70 text-xs uppercase tracking-wide text-muted">
              <tr>
                {selection && (
                  <th scope="col" className="w-12 px-5 py-3">
                    <input ref={selectAll} type="checkbox" aria-label={`Select all ${selection.noun} on this page`} checked={allSelected} onChange={toggleAll} className="size-4 accent-primary" />
                  </th>
                )}
                {columns.map(header)}
                {actions && <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = rowKey(row)
                const selected = selection?.selected.has(id) ?? false
                return (
                  <tr
                    key={id}
                    aria-selected={selection ? selected : undefined}
                    onClick={selection ? onRowClick(id) : undefined}
                    className={cn('border-t border-border/60 transition-colors', selection && 'cursor-pointer', selected ? 'bg-primary-soft' : 'hover:bg-primary-soft/40')}
                  >
                    {selection && (
                      <td className="w-12 px-5 py-3.5">
                        <input type="checkbox" aria-label={`Select ${rowLabel?.(row) ?? 'row'}`} checked={selected} onChange={() => toggle(id)} className="size-4 accent-primary" />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key} className={cn('px-5 py-3.5', column.align === 'right' && 'text-right')}>{column.cell(row)}</td>
                    ))}
                    {actions && <td className="space-x-1 whitespace-nowrap px-5 py-3.5 text-right">{actions(row)}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* below md: one card per row, same data, same selection rules */}
        <ul className="divide-y divide-border/60 md:hidden">
          {rows.map((row) => {
            const id = rowKey(row)
            const selected = selection?.selected.has(id) ?? false
            return (
              <li key={id} onClick={selection ? onRowClick(id) : undefined} className={cn('space-y-3 p-4', selection && 'cursor-pointer', selected && 'bg-primary-soft')}>
                <div className="flex items-start gap-3">
                  {selection && (
                    <input type="checkbox" aria-label={`Select ${rowLabel?.(row) ?? 'row'}`} checked={selected} onChange={() => toggle(id)} className="mt-2.5 size-5 shrink-0 accent-primary" />
                  )}
                  <div className="min-w-0 flex-1">{primary.cell(row)}</div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {columns.filter((c) => c !== primary).map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-xs text-muted">{column.header}</dt>
                      <dd className="break-words text-body">{column.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
                {actions && <div className="flex flex-wrap gap-1 border-t border-border/60 pt-3 [&_.link-action]:min-h-11 [&_.link-danger]:min-h-11">{actions(row)}</div>}
              </li>
            )
          })}
        </ul>
      </>
    )
  }

  return (
    <>
      <div className="card overflow-hidden" aria-busy={refreshing || loading}>
        {columnsPref && (
          <div className="hidden justify-end border-b border-border/60 px-3 py-1.5 md:flex">
            <ColumnsMenu items={menuItems} visible={new Set(columns.map((c) => c.key))} onChange={(keys) => setPreference.mutate({ name: `columns.${columnsPref}`, value: keys ?? allColumns.map((c) => c.key) })} />
          </div>
        )}
        {selection && selectedCount > 0 && (
          <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-primary-soft px-5 py-3 text-sm">
            <span aria-live="polite" className="font-medium text-heading">{selectedCount} selected</span>
            {selection.bulkActions?.map((action) => (
              <Button key={action.label} variant="ghost" disabled={action.busy} onClick={() => action.run(ids.filter((id) => selection.selected.has(id)))} className={cn('h-9', action.danger && 'text-destructive')}>
                {action.busy ? 'Working…' : action.label}
              </Button>
            ))}
            <button type="button" onClick={() => selection.onChange(new Set())} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted hover:text-heading">
              <X className="size-4" aria-hidden /> Clear selection
            </button>
          </div>
        )}
        <div className={cn('transition-opacity', refreshing && !loading && 'opacity-60')}>{body}</div>
      </div>
      {meta && onPageChange && rows && rows.length > 0 && <Pagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
    </>
  )
}
