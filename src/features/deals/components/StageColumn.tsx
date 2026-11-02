import { useDroppable } from '@dnd-kit/core'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Deal, Stage } from '../types'
import { DealCard } from './DealCard'

type StageColumnProps = { stage: Stage; stages: Stage[]; canEdit: boolean; canDelete: boolean; onDelete: (deal: Deal) => void; onMove: (deal: Deal, stageId: string) => void }

// Open stages cycle through these by position; won/lost get fixed colours.
const openTints = ['bg-sky-100/70 border-sky-400', 'bg-violet-100/70 border-violet-400', 'bg-amber-100/70 border-amber-400', 'bg-cyan-100/70 border-cyan-400']
const tintFor = ({ kind, position }: Stage) =>
  kind === 'won' ? 'bg-emerald-100/70 border-emerald-500' : kind === 'lost' ? 'bg-rose-100/70 border-rose-400' : openTints[position % openTints.length]

export function StageColumn({ stage, stages, canEdit, canDelete, onDelete, onMove }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  // ponytail: totals assume one currency; group by currency if multi-currency deals matter.
  const total = stage.deals.reduce((sum, d) => sum + d.valueMinor, 0)
  const currency = stage.deals[0]?.currency ?? 'USD'

  return (
    <section
      ref={setNodeRef}
      aria-label={stage.name}
      className={cn('flex w-full shrink-0 flex-col md:w-72 rounded-2xl border-t-4 p-2.5 transition', tintFor(stage), isOver && 'ring-2 ring-primary')}
    >
      <header className="mb-3 flex items-center justify-between px-1.5 pt-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-heading">
          {stage.name}
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-border">{stage.deals.length}</span>
        </h2>
        <span className="text-xs font-medium text-body">{formatMoney(total, currency)}</span>
      </header>
      <div className="flex min-h-16 flex-col gap-2.5">
        {stage.deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} stages={stages} canEdit={canEdit} canDelete={canDelete} onDelete={onDelete} onMove={onMove} />
        ))}
      </div>
    </section>
  )
}
