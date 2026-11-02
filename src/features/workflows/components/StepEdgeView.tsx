import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { useContext } from 'react'
import { ActionsContext } from '../context'
import { AddStepButton } from './AddStepButton'

// An arrow with a "+" in the middle (insert a step here) and a "true"/"false" pill when it leaves an if/else.
export function StepEdgeView({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, sourceHandleId, markerEnd }: EdgeProps) {
  const actions = useContext(ActionsContext)
  const [path, x, y] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 16 })
  const branch = sourceHandleId === 'true' || sourceHandleId === 'false' ? sourceHandleId : null
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: 'var(--color-border, #cbd5e1)', strokeWidth: 1.5 }} />
      <EdgeLabelRenderer>
        {branch && (
          <div style={{ transform: `translate(-50%, -50%) translate(${sourceX}px, ${sourceY + 24}px)` }} className="pointer-events-none absolute rounded-full border border-border bg-surface px-3 py-0.5 text-xs font-medium text-body shadow-sm">
            {branch === 'true' ? 'True' : 'False'}
          </div>
        )}
        <div style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }} className="absolute">
          <AddStepButton label="Insert a step here" onPick={(kind) => actions?.insertOnEdge(id, kind)} />
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
