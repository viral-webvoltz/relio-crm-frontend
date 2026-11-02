import { Select } from './Select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/Button'
import { PAGE_SIZES, type PageMeta } from '@/lib/apiTypes'

type PaginationProps = { meta: PageMeta; onPageChange: (page: number) => void; onPageSizeChange?: (limit: number) => void }

export function Pagination({ meta, onPageChange, onPageSizeChange }: PaginationProps) {
  const sizeId = useId()
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1
  const to = Math.min(meta.page * meta.limit, meta.total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted">
      <span aria-live="polite">
        Showing <b className="text-heading">{from}–{to}</b> of {meta.total}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor={sizeId}>Rows per page</label>
            <Select id={sizeId} value={meta.limit} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="input-base w-auto">
              {[...new Set([...PAGE_SIZES, meta.limit])].sort((a, b) => a - b).map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </Select>
          </div>
        )}
        <span>
          Page <b className="text-heading">{meta.page}</b> of {meta.totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </Button>
          <Button variant="ghost" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>
            Next <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
