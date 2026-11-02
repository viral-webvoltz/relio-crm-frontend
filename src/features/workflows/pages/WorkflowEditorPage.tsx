import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, MiniMap, Panel, ReactFlow, ReactFlowProvider, useReactFlow, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FlaskConical, Pencil, Redo2, Undo2, X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useBoard } from '@/features/deals/hooks/useDeals'
import { getUserOptions } from '@/features/users/api/usersApi'
import { cn } from '@/lib/utils'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { AddStepButton } from '../components/AddStepButton'
import { StepEdgeView } from '../components/StepEdgeView'
import { StepInspector } from '../components/StepInspector'
import { StepNodeCard } from '../components/StepNodeCard'
import { RunHistory, TestRun } from '../components/WorkflowDock'
import { ActionsContext, TraceContext, type EditorActions } from '../context'
import { autoLayout, canConnect, defaults, kindLabel, freeHandle, fromGraph, makeEdge, MAX_NODES, newNode, toGraphPayload, validate, type Kind, type Problem, type StepData, type StepEdge, type StepNode } from '../graph'
import { useRunAsMe, useSaveWorkflow, useWorkflowMeta, useWorkflowSettings, useWorkflows } from '../hooks/useWorkflows'
import { triggerLabel, type TriggerMeta, type Workflow } from '../types'

const alertClass = 'rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive'
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const nodeTypes = { step: StepNodeCard }
const edgeTypes = { step: StepEdgeView }
const TABS = [
  { key: 'builder', label: 'Builder' },
  { key: 'settings', label: 'Settings' },
  { key: 'logs', label: 'Execution logs' },
] as const
type Tab = (typeof TABS)[number]['key']
type Snapshot = { nodes: StepNode[]; edges: StepEdge[] }
type ServerIssue = { message?: string }

const initial = (w?: Workflow): Snapshot => {
  if (!w) return { nodes: [{ id: 'trigger', type: 'step', position: { x: 0, y: 0 }, deletable: false, selected: true, data: { kind: 'trigger', config: structuredClone(defaults.trigger) } }], edges: [] }
  const graph = fromGraph(w.graph)
  return { ...graph, nodes: graph.nodes.map((n) => (n.data.kind === 'trigger' ? { ...n, deletable: false } : n)) }
}
const deselect = (nodes: StepNode[]) => nodes.map((n) => (n.selected ? { ...n, selected: false } : n))

type EditorProps = { metaFailed?: boolean; orgTimezone?: string; workflow?: Workflow; people: { id: string; fullName: string }[]; stages: { id: string; name: string }[]; metaTriggers?: TriggerMeta[] }

function Editor({ workflow, people, stages, metaTriggers, metaFailed, orgTimezone }: EditorProps) {
  const navigate = useNavigate()
  const { fitView } = useReactFlow()
  const save = useSaveWorkflow(workflow?.id)
  const runAsMe = useRunAsMe()
  const [start] = useState(() => initial(workflow))
  const [nodes, setNodes] = useState(start.nodes)
  const [edges, setEdges] = useState(start.edges)
  const [name, setName] = useState(workflow?.name ?? '')
  const [isActive, setIsActive] = useState(workflow?.isActive ?? false)
  const [dirty, setDirty] = useState(false)
  const [problems, setProblems] = useState<Problem[]>([])
  const [trace, setTrace] = useState<Record<string, string> | null>(null)
  const [tab, setTab] = useState<Tab>('builder')
  const [testOpen, setTestOpen] = useState(false)
  const { allowLeave } = useUnsavedGuard(dirty)

  // ---- undo / redo: snapshots of the canvas, taken just before a change. Typing in one box counts as one change.
  const past = useRef<Snapshot[]>([])
  const future = useRef<Snapshot[]>([])
  const lastKey = useRef({ key: '', at: 0 })
  const [depth, setDepth] = useState({ undo: 0, redo: 0 })
  const syncDepth = () => setDepth({ undo: past.current.length, redo: future.current.length })
  const snapshot = (key = '') => {
    const now = Date.now()
    const repeat = key !== '' && lastKey.current.key === key && now - lastKey.current.at < 1000
    lastKey.current = { key, at: now }
    if (repeat) return
    past.current = [...past.current.slice(-49), { nodes, edges }]
    future.current = []
    syncDepth()
  }
  const travel = (from: typeof past, to: typeof past) => {
    const target = from.current.pop()
    if (!target) return
    to.current.push({ nodes, edges })
    setNodes(target.nodes)
    setEdges(target.edges)
    setTrace(null)
    setDirty(true)
    syncDepth()
  }
  const undo = () => travel(past, future)
  const redo = () => travel(future, past)

  const selected = nodes.find((n) => n.selected)
  const triggerEvent = (nodes.find((n) => n.data.kind === 'trigger')?.data.config as { event: string } | undefined)?.event ?? ''
  const fields = metaTriggers?.find((t) => t.event === triggerEvent)?.fields ?? []

  // Structural changes re-run the tidy layout and bring the whole flow back into view.
  const apply = (ns: StepNode[], es: StepEdge[]) => {
    setNodes(autoLayout(ns, es))
    setEdges(es)
    setTrace(null)
    setDirty(true)
    setTimeout(() => fitView({ padding: 0.3, maxZoom: 1, duration: reducedMotion() ? 0 : 250 }), 60)
  }
  const edit = () => {
    setDirty(true)
    setTrace(null)
  }

  const onNodesChange = (changes: NodeChange<StepNode>[]) => {
    if (changes.some((c) => c.type === 'remove')) snapshot()
    setNodes((ns) => applyNodeChanges(changes, ns))
    if (changes.some((c) => c.type === 'remove' || c.type === 'add')) setTrace(null)
    if (changes.some((c) => c.type !== 'select' && c.type !== 'dimensions')) setDirty(true)
  }
  const onEdgesChange = (changes: EdgeChange<StepEdge>[]) => {
    if (changes.some((c) => c.type === 'remove')) snapshot()
    setEdges((es) => applyEdgeChanges(changes, es))
    if (changes.some((c) => c.type !== 'select')) edit()
  }
  const onConnect = (c: Connection) => {
    snapshot()
    setEdges((es) => addEdge(makeEdge(c.source, c.sourceHandle ?? 'next', c.target), es))
    edit()
  }

  const actions: EditorActions = {
    addAfter: (sourceId, handle, kind) => {
      if (nodes.length >= MAX_NODES) return void toast.error(`A workflow can have at most ${MAX_NODES} steps.`)
      snapshot()
      const node = { ...newNode(kind, { x: 0, y: 0 }), selected: true }
      apply([...deselect(nodes), node], [...edges, makeEdge(sourceId, handle, node.id)])
    },
    insertOnEdge: (edgeId, kind) => {
      const edge = edges.find((e) => e.id === edgeId)
      if (!edge) return
      if (nodes.length >= MAX_NODES) return void toast.error(`A workflow can have at most ${MAX_NODES} steps.`)
      snapshot()
      const node = { ...newNode(kind, { x: 0, y: 0 }), selected: true }
      const rest = edges.filter((e) => e.id !== edgeId)
      apply([...deselect(nodes), node], [...rest, makeEdge(edge.source, edge.sourceHandle ?? 'next', node.id), makeEdge(node.id, kind === 'condition' ? 'true' : 'next', edge.target)])
    },
    duplicate: (id) => {
      const original = nodes.find((n) => n.id === id)
      if (!original || nodes.length >= MAX_NODES) return
      snapshot()
      const copy = { ...structuredClone({ ...original, selected: false }), id: crypto.randomUUID(), position: { x: original.position.x + 40, y: original.position.y + 40 }, selected: true }
      setNodes([...deselect(nodes), copy])
      edit()
    },
    remove: async (id) => {
      const node = nodes.find((n) => n.id === id)
      if (!node || node.data.kind === 'trigger') return
      if (!(await confirmDialog(`Delete this “${kindLabel(node.data.kind)}” step? You can bring it back with Undo (Ctrl+Z).`, { title: 'Delete step?', confirmLabel: 'Delete step' }))) return
      snapshot()
      const incoming = edges.filter((e) => e.target === id)
      const outgoing = edges.filter((e) => e.source === id)
      const kept = edges.filter((e) => e.source !== id && e.target !== id)
      // Deleting a step in the middle of a line joins its neighbours back together.
      const bridge = incoming.length === 1 && outgoing.length === 1 && node.data.kind !== 'condition' ? [makeEdge(incoming[0]!.source, incoming[0]!.sourceHandle ?? 'next', outgoing[0]!.target)] : []
      apply(nodes.filter((n) => n.id !== id), [...kept, ...bridge])
    },
  }

  // The corner "Add": after the selected step if it has a free output, otherwise as a loose step to connect by hand.
  const addFromCorner = (kind: Kind) => {
    const handle = freeHandle(selected, edges)
    if (selected && handle) return actions.addAfter(selected.id, handle, kind)
    if (nodes.length >= MAX_NODES) return void toast.error(`A workflow can have at most ${MAX_NODES} steps.`)
    snapshot()
    const lowest = Math.max(...nodes.map((n) => n.position.y))
    setNodes([...deselect(nodes), { ...newNode(kind, { x: 0, y: lowest + 180 }), selected: true }])
    edit()
  }

  // Keyboard- and screen-reader-friendly way to connect steps (dragging a dot is the mouse way).
  const stepName = (n: StepNode) => `Step ${nodes.indexOf(n) + 1}: ${kindLabel(n.data.kind)}`
  const outputsFor = (node: StepNode) =>
    (node.data.kind === 'condition' ? ['true', 'false'] : ['next']).map((handle) => {
      const current = edges.find((e) => e.source === node.id && e.sourceHandle === handle)
      const others = edges.filter((e) => e !== current)
      return {
        handle,
        value: current?.target ?? '',
        options: nodes.filter((n) => n.id === current?.target || canConnect(nodes, others, { source: node.id, target: n.id, sourceHandle: handle })).map((n) => ({ value: n.id, label: stepName(n) })),
      }
    })
  const reconnect = (sourceId: string, handle: string, targetId: string) => {
    snapshot()
    setEdges((es) => {
      const rest = es.filter((e) => !(e.source === sourceId && e.sourceHandle === handle))
      return targetId ? [...rest, makeEdge(sourceId, handle, targetId)] : rest
    })
    edit()
  }

  const updateConfig = (id: string, config: StepData['config']) => {
    snapshot(`config:${id}`)
    setNodes((ns) => ns.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, config } } as StepNode) : n)))
    edit()
  }
  const focusNode = (id?: string) => {
    if (!id) return
    setTab('builder')
    setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === id })))
  }

  const onSave = () => {
    const found = validate(nodes, edges)
    if (!name.trim()) found.unshift({ message: 'Give the workflow a name (Settings tab, or the title at the top).' })
    setProblems(found)
    if (found.length) return
    save.mutate(
      { name: name.trim(), trigger: triggerEvent, isActive, graph: toGraphPayload(nodes, edges) },
      {
        onSuccess: () => {
          allowLeave()
          setDirty(false)
          toast.success(workflow ? 'Workflow saved' : 'Workflow created')
          navigate('/settings/workflows')
        },
      },
    )
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const typing = e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)
    if (typing || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
  }

  const serverIssues = save.error?.code === 'VALIDATION_ERROR' ? ((save.error.errors ?? []) as ServerIssue[]).map((i) => i.message).filter(Boolean) : []
  const saveLabel = workflow ? (dirty ? 'Save changes' : 'Saved') : 'Create workflow'

  return (
    <div role="dialog" aria-modal="true" aria-label="Workflow editor" className="fixed inset-0 z-50 flex flex-col bg-background" onKeyDown={onKeyDown}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Link to="/settings/workflows" className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-heading hover:bg-background">
          <ArrowLeft className="size-5" aria-hidden /> <span className="max-sm:sr-only">Workflows</span>
        </Link>
        <div className="relative order-last w-full sm:order-none sm:mx-auto sm:max-w-sm sm:flex-1">
          <label htmlFor="wf-name" className="sr-only">Workflow name</label>
          <input
            id="wf-name"
            className="h-10 w-full rounded-xl border border-transparent bg-transparent px-3 pr-9 text-center text-sm font-semibold text-heading placeholder:font-normal hover:border-border focus:border-primary focus:bg-surface"
            autoComplete="off"
            maxLength={100}
            required
            aria-required="true"
            placeholder="Name your workflow (required)"
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true) }}
          />
          <Pencil className="pointer-events-none absolute right-3 top-3 size-4 text-muted" aria-hidden />
        </div>
        <button type="button" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={depth.undo === 0} onClick={undo} className="grid size-10 place-items-center rounded-xl border border-border text-body hover:bg-background disabled:opacity-40"><Undo2 className="size-4" aria-hidden /></button>
        <button type="button" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={depth.redo === 0} onClick={redo} className="grid size-10 place-items-center rounded-xl border border-border text-body hover:bg-background disabled:opacity-40"><Redo2 className="size-4" aria-hidden /></button>
        <Button type="button" loading={save.isPending} disabled={save.isSuccess || (Boolean(workflow) && !dirty)} onClick={onSave}>{saveLabel}</Button>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-3">
        <div role="tablist" aria-label="Editor sections" className="flex overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={cn('h-11 border-b-2 px-4 text-sm font-medium', tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-heading')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 py-1">
          <button type="button" aria-pressed={testOpen} onClick={() => { setTab('builder'); setTestOpen((o) => !o); setTrace(null) }} className={cn('btn-ghost h-9 gap-1.5', testOpen && 'border-primary bg-primary-soft text-primary')}>
            <FlaskConical className="size-4" aria-hidden /> <span className="max-sm:sr-only">Test workflow</span>
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className={cn(!isActive ? 'font-medium text-heading' : 'text-muted')}>Draft</span>
            <button type="button" role="switch" aria-checked={isActive} aria-label="Publish workflow" onClick={() => { setIsActive((a) => !a); setDirty(true) }} className={cn('relative h-6 w-11 rounded-full transition', isActive ? 'bg-primary' : 'bg-border')}>
              <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', isActive ? 'left-[22px]' : 'left-0.5')} />
            </button>
            <span className={cn(isActive ? 'font-medium text-heading' : 'text-muted')}>Publish</span>
          </div>
        </div>
      </div>

      {(problems.length > 0 || save.error) && (
        <div role="alert" className={`${alertClass} mx-3 mt-3`}>
          <p className="font-medium">{save.error && problems.length === 0 ? 'The server could not save this workflow.' : 'Fix these before saving:'}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {problems.map((p) => (
              <li key={`${p.nodeId ?? ''}${p.message}`}>{p.nodeId ? <button type="button" className="underline" onClick={() => focusNode(p.nodeId)}>{p.message}</button> : p.message}</li>
            ))}
            {problems.length === 0 && (serverIssues.length ? serverIssues.map((m) => <li key={m}>{m}</li>) : <li>{save.error?.code === 'WORKFLOW_LIMIT' ? 'You have reached the limit of 50 workflows. Delete one first.' : save.error?.message}</li>)}
          </ul>
        </div>
      )}

      {tab === 'builder' && (
        <div className="relative flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1" aria-label="Workflow canvas">
              <ActionsContext.Provider value={actions}>
                <TraceContext.Provider value={trace}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeDragStart={() => snapshot()}
                    isValidConnection={(c) => canConnect(nodes, edges, c)}
                    colorMode="light"
                    style={{ ['--xy-background-color' as string]: 'transparent' }}
                    fitView
                    fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
                    minZoom={0.3}
                    maxZoom={1.5}
                    deleteKeyCode={['Backspace', 'Delete']}
                    onBeforeDelete={async ({ nodes: doomed }) => doomed.length === 0 || (await confirmDialog(`Delete ${doomed.length === 1 ? 'this step' : `these ${doomed.length} steps`}? You can bring ${doomed.length === 1 ? 'it' : 'them'} back with Undo (Ctrl+Z).`, { title: 'Delete step?', confirmLabel: 'Delete' }))}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background gap={22} color="var(--border)" />
                    <Controls showInteractive={false} />
                    <MiniMap pannable zoomable className="max-md:hidden" nodeColor="var(--primary)" />
                    {nodes.length === 1 && (
                      <Panel position="top-center">
                        <p className="max-w-xs rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm text-body shadow-sm">
                          Start by choosing what <strong className="text-heading">triggers</strong> this workflow on the right, then press the <strong className="text-heading">+</strong> under the card to add steps.
                        </p>
                      </Panel>
                    )}
                    <Panel position="top-right">
                      <AddStepButton variant="button" align="right" label="Add a step" onPick={addFromCorner} />
                    </Panel>
                  </ReactFlow>
                </TraceContext.Provider>
              </ActionsContext.Provider>
            </div>
            {testOpen && (
              <section aria-label="Test workflow" className="max-h-80 overflow-y-auto border-t border-border bg-surface">
                <div className="flex items-center justify-between px-4 pt-3">
                  <h2 className="text-sm font-semibold text-heading">Test workflow</h2>
                  <button type="button" aria-label="Close test panel" onClick={() => { setTestOpen(false); setTrace(null) }} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-background"><X className="size-4" aria-hidden /></button>
                </div>
                <TestRun nodes={nodes} edges={edges} onTrace={setTrace} />
              </section>
            )}
          </div>
          {selected && (
            <aside aria-label="Step settings" className="z-10 w-full overflow-y-auto border-l border-border bg-surface p-4 max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 max-lg:max-h-[60%] max-lg:rounded-t-2xl max-lg:border-t max-lg:shadow-2xl lg:w-80">
              <button type="button" aria-label="Close step settings" onClick={() => setNodes((ns) => deselect(ns))} className="float-right grid size-8 place-items-center rounded-lg text-muted hover:bg-background"><X className="size-4" aria-hidden /></button>
              <StepInspector data={selected.data} trigger={triggerEvent} orgTimezone={orgTimezone} metaFailed={metaFailed} outputs={outputsFor(selected)} onConnect={(handle, target) => reconnect(selected.id, handle, target)} fields={fields} people={people} stages={stages} onChange={(config) => updateConfig(selected.id, config)} onRemove={() => actions.remove(selected.id)} />
            </aside>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="card mx-auto max-w-xl space-y-5 p-6">
            <div className="space-y-1.5">
              <label htmlFor="wf-name-2" className="text-sm font-medium text-heading">Workflow name <span className="text-destructive" aria-hidden>*</span></label>
              <input id="wf-name-2" className="input-base" autoComplete="off" maxLength={100} required aria-required="true" aria-invalid={problems.some((p) => !p.nodeId && p.message.startsWith('Give the workflow a name')) || undefined} value={name} onChange={(e) => { setName(e.target.value); setDirty(true) }} />
            </div>
            <div>
              <p className="text-sm font-medium text-heading">Status</p>
              <p className="mt-1 text-sm text-muted">{isActive ? 'Published: it runs whenever its trigger happens.' : 'Draft: it does not run. Publish it when it is ready.'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-heading">Trigger</p>
              <p className="mt-1 text-sm text-muted">{triggerEvent ? triggerLabel(triggerEvent) : 'Not chosen yet. Select the trigger step in the Builder.'}</p>
            </div>
            {workflow?.runsAs && (
              <div>
                <p className="text-sm font-medium text-heading">Runs as</p>
                <p className="mt-1 text-sm text-muted">
                  {workflow.runsAs.willRunAs ? workflow.runsAs.willRunAs.name : 'Nobody — no active admin was found.'} (scheduled runs act as a person, for "assign to the person who made the change" and notifications).
                </p>
                {workflow.runsAs.problem && (
                  <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-warning/10 px-3 py-2 text-sm text-heading">
                    {workflow.runsAs.problem === 'inactive' ? `${workflow.runsAs.creator?.name ?? 'The creator'} was deactivated.` : 'The person who created this was removed.'}
                    <Button type="button" variant="ghost" loading={runAsMe.isPending} onClick={() => runAsMe.mutate(workflow.id, { onSuccess: () => toast.success('This workflow now runs as you'), onError: (e) => toast.error(e.message) })}>Run as me</Button>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted">{nodes.length} step{nodes.length === 1 ? '' : 's'} · up to {MAX_NODES} allowed. Changes apply when you save.</p>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {workflow ? <RunHistory workflowId={workflow.id} onShow={(t) => { setTab('builder'); setTestOpen(false); setTrace(t) }} /> : <p className="p-6 text-sm text-muted">Save this workflow first. After it runs, every run and the result of each step is listed here.</p>}
        </div>
      )}
    </div>
  )
}

export function WorkflowEditorPage() {
  const { id } = useParams()
  const workflows = useWorkflows()
  const users = useQuery({ queryKey: ['users', 'options'], queryFn: getUserOptions, staleTime: 60_000 })
  const board = useBoard()
  const meta = useWorkflowMeta()
  const settings = useWorkflowSettings()

  if (workflows.isPending || users.isPending || board.isPending) return <PageSkeleton />
  const failed = workflows.error ?? users.error ?? board.error
  if (failed) return <p role="alert" className={alertClass}>{failed.message}</p>
  const workflow = workflows.data?.find((w) => w.id === id)
  if (id && !workflow) return <p role="alert" className={alertClass}>Workflow not found</p>
  return (
    <ReactFlowProvider>
      <Editor workflow={workflow} people={users.data ?? []} stages={board.data?.stages ?? []} metaTriggers={meta.data} metaFailed={meta.isError} orgTimezone={settings.data?.timezone} />
    </ReactFlowProvider>
  )
}
