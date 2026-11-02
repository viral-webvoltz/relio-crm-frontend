import { Handle, Position, useNodeConnections, type NodeProps } from '@xyflow/react'
import { Copy, Trash2 } from 'lucide-react'
import { useContext } from 'react'
import { cn } from '@/lib/utils'
import { ActionsContext, TraceContext } from '../context'
import { isTimedTrigger, operators, kindLabel, type StepData, type StepNode } from '../graph'
import { kindIcons } from '../kindIcons'
import { triggerLabel } from '../types'
import { AddStepButton } from './AddStepButton'

// One line of what the step does. All text is rendered by React (escaped), never as HTML.
function summary(d: StepData): string {
  switch (d.kind) {
    case 'trigger':
      if (!d.config.event) return 'Choose an event'
      return isTimedTrigger(d.config.event) ? `${triggerLabel(d.config.event)} · ${d.config.at}` : triggerLabel(d.config.event)
    case 'condition': {
      const first = d.config.rules[0]
      if (!first?.field) return 'Add a rule'
      const op = operators.find((o) => o.value === first.operator)?.label ?? first.operator
      const more = d.config.rules.length > 1 ? ` +${d.config.rules.length - 1} more` : ''
      return `${first.field} ${op} ${first.value}`.trim() + more
    }
    case 'create_task':
    case 'notify':
      return d.config.title || 'Set a title'
    case 'update_record':
      return d.config.field ? `${d.config.field} → ${d.config.value}` : 'Choose a field'
    case 'send_email':
      return d.config.subject || 'Set a subject'
    case 'http_request':
      return d.config.url ? `${d.config.method} ${d.config.url}` : 'Set an address'
    case 'delay':
      return `Wait ${d.config.amount} ${d.config.unit}`
  }
}

const handleClass = 'size-2.5! border-2! border-surface! bg-primary!'

// An output with nothing after it: a short stub, a "+" to add the next step, and an END marker for context.
function OutputSlot({ nodeId, handle, left }: { nodeId: string; handle: string; left: string }) {
  const actions = useContext(ActionsContext)
  const connections = useNodeConnections({ handleType: 'source', handleId: handle })
  return (
    <>
      <Handle id={handle} type="source" position={Position.Bottom} style={{ left }} className={handleClass} />
      {connections.length === 0 && (
        <div style={{ left }} className="absolute top-full flex -translate-x-1/2 flex-col items-center">
          <span className="h-5 w-px bg-border" aria-hidden />
          <AddStepButton label={handle === 'next' ? 'Add the next step' : `Add a step for ${handle}`} onPick={(kind) => actions?.addAfter(nodeId, handle, kind)} />
        </div>
      )}
    </>
  )
}

export function StepNodeCard({ id, data, selected }: NodeProps<StepNode>) {
  const Icon = kindIcons[data.kind]
  const actions = useContext(ActionsContext)
  const trace = useContext(TraceContext)
  const outcome = trace?.[id]
  const isCondition = data.kind === 'condition'
  return (
    <div className={cn('group relative w-60 rounded-2xl border bg-surface shadow-sm', selected ? 'border-primary ring-2 ring-primary/30' : outcome === 'failed' ? 'border-destructive ring-2 ring-destructive/25' : outcome ? 'border-success ring-2 ring-success/25' : 'border-border', trace && !outcome && 'opacity-50')}>
      {outcome && outcome !== 'ran' && <span className={cn('absolute -top-2.5 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white', outcome === 'failed' ? 'bg-destructive' : 'bg-success')}>{outcome}</span>}
      {data.kind !== 'trigger' && <Handle type="target" position={Position.Top} className={handleClass} />}
      <div className="flex items-center gap-2.5 p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="size-[18px]" aria-hidden /></span>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{kindLabel(data.kind)}</div>
          <div className="truncate text-sm font-medium text-heading">{summary(data)}</div>
        </div>
      </div>
      {selected && data.kind !== 'trigger' && (
        <div className="nodrag nopan flex items-center gap-1 border-t border-border/70 px-2 py-1">
          <button type="button" aria-label="Duplicate step" title="Duplicate" onClick={() => actions?.duplicate(id)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-background hover:text-heading"><Copy className="size-4" aria-hidden /></button>
          <button type="button" aria-label="Delete step" title="Delete" onClick={() => actions?.remove(id)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" aria-hidden /></button>
        </div>
      )}
      {isCondition ? (
        <>
          <OutputSlot nodeId={id} handle="true" left="25%" />
          <OutputSlot nodeId={id} handle="false" left="75%" />
        </>
      ) : (
        <OutputSlot nodeId={id} handle="next" left="50%" />
      )}
    </div>
  )
}
