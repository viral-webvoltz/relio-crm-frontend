import { Select } from '@/components/ui/Select'
import { useDraggable } from '@dnd-kit/core'
import { CalendarDays, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Deal, Stage } from '../types'

type DealCardProps = { deal: Deal; stages: Stage[]; canEdit: boolean; canDelete: boolean; onDelete: (deal: Deal) => void; onMove: (deal: Deal, stageId: string) => void; isOverlay?: boolean }

export function DealCard({ deal, stages, canEdit, canDelete, onDelete, onMove, isOverlay }: DealCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id, disabled: !canEdit })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border border-border/70 bg-surface p-3.5 text-sm shadow-[0_1px_2px_rgb(16_24_40/0.05)] transition hover:shadow-md',
        isDragging && !isOverlay && 'opacity-40',
        isOverlay && 'rotate-1 shadow-xl',
      )}
    >
      <div className={cn('flex items-start gap-1.5 font-semibold text-heading', canEdit && 'cursor-grab')} {...listeners} {...attributes}>
        {canEdit && <GripVertical className="mt-0.5 size-4 shrink-0 text-muted/60" aria-hidden />}
        {deal.title}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="text-sm font-semibold text-heading">{formatMoney(deal.valueMinor, deal.currency)}</span>
        {deal.expectedCloseDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden /> {deal.expectedCloseDate}
          </span>
        )}
      </div>
      {deal.lostReason && <div className="mt-2 rounded-lg bg-destructive/10 px-2 py-1 text-xs text-destructive">Lost: {deal.lostReason}</div>}
      {canEdit && !isOverlay && (
        <label className="mt-3 block text-xs text-muted">
          <span className="sr-only">Move “{deal.title}” to stage</span>
          <Select value={deal.stageId} onChange={(e) => onMove(deal, e.target.value)} aria-label={`Move “${deal.title}” to stage`} className="input-base h-11 w-full text-sm md:h-9">
            {stages.map((s) => <option key={s.id} value={s.id}>{s.id === deal.stageId ? `Stage: ${s.name}` : `Move to ${s.name}`}</option>)}
          </Select>
        </label>
      )}
      {(canEdit || canDelete) && (
        <div className="mt-3 flex gap-1 border-t border-border/70 pt-2.5">
          {canEdit && (
            <Link to={`/deals/${deal.id}/edit`} className="link-action inline-flex items-center gap-1">
              <Pencil className="size-3" aria-hidden /> Edit
            </Link>
          )}
          {canDelete && (
            <button type="button" className="link-danger inline-flex items-center gap-1" onClick={() => onDelete(deal)}>
              <Trash2 className="size-3" aria-hidden /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
