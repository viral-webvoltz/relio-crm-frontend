import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { confirmDialog, promptDialog } from '@/components/ui/ConfirmHost'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useUndoToast } from '@/lib/useBatch'
import { useCan } from '@/features/auth/hooks/useCan'
import { cn } from '@/lib/utils'
import { DealCard } from '../components/DealCard'
import { DealsTable } from '../components/DealsTable'
import { StageColumn } from '../components/StageColumn'
import { useBoard, useDeleteDeal, useMoveDeal } from '../hooks/useDeals'
import type { Deal } from '../types'

export function DealsPage() {
  const { data: board, isPending, isError, error, refetch } = useBoard()
  const moveDeal = useMoveDeal()
  const deleteDeal = useDeleteDeal()
  const undoToast = useUndoToast()
  const canCreate = useCan('deals.create')
  const canEdit = useCan('deals.update')
  const canDelete = useCan('deals.delete')
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'table' ? 'table' : 'board'
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)

  // A small drag distance keeps clicks on Edit/Delete from starting a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  const handleDragStart = ({ active }: DragStartEvent) =>
    setActiveDeal(board?.stages.flatMap((s) => s.deals).find((d) => d.id === active.id) ?? null)

  // Shared by drag-and-drop and the "Move to" menu, so both follow the same rules (lost-reason prompt, rollback on error).
  const requestMove = async (deal: Deal, targetId: string | undefined) => {
    const target = board?.stages.find((s) => s.id === targetId)
    if (!target || deal.stageId === target.id) return

    let lostReason: string | undefined
    if (target.kind === 'lost') {
      const answer = await promptDialog('Why was this deal lost? You can leave it blank.', { title: 'Mark deal as lost', inputLabel: 'Reason (optional)' })
      if (answer === null) return // cancelled: leave the deal where it is
      lostReason = answer.trim() || undefined
    }
    moveDeal.mutate({ dealId: deal.id, stageId: target.id, lostReason }, { onError: (e) => toast.error(e.message) })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDeal(null)
    const deal = board?.stages.flatMap((s) => s.deals).find((d) => d.id === active.id)
    if (deal) void requestMove(deal, over ? String(over.id) : undefined)
  }

  const handleDelete = async (deal: Deal) => {
    if (!await confirmDialog(`Delete deal "${deal.title}"?`)) return
    deleteDeal.mutate(deal.id, { onSuccess: () => undoToast('deals', deal.id, 'Deal'), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle={view === 'table' ? 'Search, sort and export every deal.' : 'Drag deals between stages, or use “Move to” on a card.'}
        actions={
          canCreate && (
            <Link to="/deals/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> New deal
            </Link>
          )
        }
      />
      <div className="mb-4 flex gap-2" role="group" aria-label="View">
        {(['board', 'table'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setSearchParams(option === 'board' ? {} : { view: 'table' })}
            className={cn('btn-ghost h-10', view === option && 'border-primary bg-primary-soft text-primary')}
          >
            {option === 'board' ? 'Board' : 'List'}
          </button>
        ))}
      </div>
      {isPending ? (
        <PageSkeleton />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : view === 'table' ? (
        <DealsTable stages={board.stages} />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDeal(null)}>
          <div className="flex flex-col gap-3 pb-4 md:flex-row md:overflow-x-auto">
            {board.stages.map((stage) => (
              <StageColumn key={stage.id} stage={stage} stages={board.stages} canEdit={canEdit} canDelete={canDelete} onDelete={handleDelete} onMove={requestMove} />
            ))}
          </div>
          <DragOverlay>{activeDeal && <DealCard deal={activeDeal} stages={board?.stages ?? []} canEdit={false} canDelete={false} onDelete={handleDelete} onMove={requestMove} isOverlay />}</DragOverlay>
        </DndContext>
      )}
    </>
  )
}
