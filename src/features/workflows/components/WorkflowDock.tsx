import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Play, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { httpClient, type ApiError } from '@/lib/httpClient'
import { cn } from '@/lib/utils'
import { kindLabel, type Kind, type StepEdge, type StepNode } from '../graph'
import { defaultSample, parseSample, simulate, type TraceStep } from '../simulate'
import { triggerLabel } from '../types'

type RunStep = { nodeId: string; type: Kind; status: 'ok' | 'waiting' | 'failed' | 'would_run'; branch?: 'true' | 'false'; error?: string }
type Run = { id: string; event: string; status: 'success' | 'failed' | 'waiting'; steps: RunStep[]; startedAt: string }

const runTone = { success: 'success', failed: 'danger', waiting: 'info' } as const
const stepTone = { ok: 'success', waiting: 'info', failed: 'danger', would_run: 'neutral' } as const
const stepText = { ok: 'done', waiting: 'waiting', failed: 'failed', would_run: 'would run' } as const

/** What the workflow has really done: one row per run with the result of every step. Refreshes while open. */
export function RunHistory({ workflowId, onShow }: { workflowId: string; onShow?: (trace: Record<string, string>) => void }) {
  const runs = useQuery<Run[], ApiError>({
    queryKey: ['workflow-runs', workflowId],
    queryFn: async ({ signal }) => (await httpClient.get<{ data: Run[] }>(`/workflows/${workflowId}/runs`, { params: { limit: 50 }, signal })).data.data,
    refetchInterval: 10_000,
    retry: false,
  })

  if (runs.isPending) return <p className="p-4 text-sm text-muted">Loading runs…</p>
  if (runs.isError) return <p role="alert" className="p-4 text-sm text-destructive">{runs.error.message}</p>
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Runs from the last 30 days, newest first. This list refreshes every 10 seconds.</p>
        <button type="button" aria-label="Refresh runs" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-background" onClick={() => runs.refetch()}>
          <RefreshCw className={cn('size-4', runs.isFetching && 'animate-spin')} aria-hidden />
        </button>
      </div>
      {runs.data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">This workflow has not run yet. When it does, every run and the result of each step shows up here.</p>
      ) : (
        <ul className="space-y-2">
          {runs.data.map((run) => (
            <li key={run.id} className="rounded-xl border border-border/70 bg-surface p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={runTone[run.status] ?? 'neutral'}>{run.status}</Badge>
                <span className="font-medium text-heading">{triggerLabel(run.event)}</span>
                <span className="text-xs text-muted">{format(parseISO(run.startedAt), 'd MMM yyyy, HH:mm:ss')}</span>
                {onShow && (
                  <button type="button" className="link-action ml-auto" onClick={() => onShow(Object.fromEntries(run.steps.filter((s) => s.nodeId).map((s) => [s.nodeId, s.status === 'failed' ? 'failed' : (s.branch ?? 'ran')])))}>
                    Show on canvas
                  </button>
                )}
              </div>
              {run.steps.length > 0 && (
                <ol className="mt-2 space-y-1 border-l border-border pl-3 text-xs text-body">
                  {run.steps.map((s, i) => (
                    <li key={`${s.nodeId}-${i}`} className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-heading">{kindLabel(s.type)}</span>
                      {s.branch && <Badge tone={s.branch === 'true' ? 'success' : 'warning'}>{s.branch}</Badge>}
                      <Badge tone={stepTone[s.status] ?? 'neutral'}>{stepText[s.status] ?? s.status}</Badge>
                      {s.error && <span className="text-destructive">{s.error}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Dry run in the browser against a sample record, on the canvas as it is now (even unsaved). Nothing is sent. */
export function TestRun({ nodes, edges, onTrace }: { nodes: StepNode[]; edges: StepEdge[]; onTrace: (t: Record<string, string> | null) => void }) {
  const [raw, setRaw] = useState(() => defaultSample(nodes))
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ steps: TraceStep[]; notReached: number } | null>(null)

  const run = () => {
    const parsed = parseSample(raw)
    if (!parsed.ok) {
      setError(parsed.message)
      setResult(null)
      return onTrace(null)
    }
    setError('')
    const { steps, notReached } = simulate(nodes, edges, parsed.value)
    setResult({ steps, notReached: notReached.length })
    onTrace(Object.fromEntries(steps.map((s) => [s.nodeId, s.outcome])))
  }

  return (
    <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="space-y-2">
        <label htmlFor="wf-sample" className="text-sm font-medium text-heading">Sample record (JSON)</label>
        <textarea id="wf-sample" rows={7} spellCheck={false} className="input-base h-auto py-2 font-mono text-xs" value={raw} onChange={(e) => setRaw(e.target.value)} aria-invalid={error ? true : undefined} />
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <button type="button" className="btn-primary h-9 gap-1.5" onClick={run}><Play className="size-4" aria-hidden /> Run test</button>
          <button type="button" className="btn-ghost h-9" onClick={() => setRaw(defaultSample(nodes))}>Reset sample</button>
        </div>
        <p className="text-xs text-muted">Runs in your browser. Nothing is created or sent.</p>
      </div>
      <div className="min-w-0">
        {!result ? (
          <p className="text-sm text-muted">Run a test to see which steps would run and which way each if/else goes. The path lights up on the canvas.</p>
        ) : (
          <ol className="space-y-2" aria-live="polite">
            {result.steps.map((s, i) => (
              <li key={s.nodeId} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{i + 1}</span>
                <div className="min-w-0">
                  <span className="font-medium text-heading">{s.label}</span> {s.outcome !== 'ran' && <Badge tone={s.outcome === 'true' ? 'success' : 'warning'}>{s.outcome}</Badge>}
                  <p className="text-body">{s.detail}</p>
                </div>
              </li>
            ))}
            {result.notReached > 0 && <li className="text-xs text-muted">{result.notReached} step{result.notReached > 1 ? 's' : ''} not reached with this sample.</li>}
          </ol>
        )}
      </div>
    </div>
  )
}
