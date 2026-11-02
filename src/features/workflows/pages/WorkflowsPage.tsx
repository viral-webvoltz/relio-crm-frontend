import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { confirmDialog, promptDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { useDeleteWorkflow, useRunAsMe, useToggleWorkflow, useUpdateWorkflowSettings, useWorkflowQueue, useWorkflowSettings, useWorkflows } from '../hooks/useWorkflows'
import { validTimezone } from '../graph'
import { triggerLabel, type Workflow } from '../types'

const AUTO_PAUSE_AFTER = 10
const DAYS: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

// The clock scheduled workflows use unless they name their own timezone.
function TimezoneNote() {
  const settings = useWorkflowSettings()
  const update = useUpdateWorkflowSettings()
  if (!settings.data) return null
  const change = async () => {
    const next = (await promptDialog('Scheduled workflows run on this clock unless a workflow sets its own. Use a name like Asia/Kolkata or America/New_York.', { title: 'Schedule timezone', inputLabel: 'Timezone', confirmLabel: 'Save' }))?.trim()
    if (!next || next === settings.data.timezone) return
    if (!validTimezone(next)) return void toast.error('That is not a timezone name. Try something like Europe/London.')
    update.mutate(next, { onSuccess: () => toast.success('Schedule timezone updated'), onError: (e) => toast.error(e.message) })
  }
  return (
    <p className="mb-3 text-sm text-muted">
      Scheduled workflows run on <span className="font-medium text-heading">{settings.data.timezone}</span> time unless they set their own.{' '}
      <button type="button" className="link-action" onClick={change} disabled={update.isPending}>Change</button>
    </p>
  )
}

// Workflows react through a queue. Normally it is empty; when events are stuck or retrying, say so in plain words.
function QueueNote() {
  const { data } = useWorkflowQueue()
  if (!data) return null
  const { events, delayed } = data
  const problem = events.retrying > 0 || events.oldestSeconds > 120 || delayed.overdue > 0
  const parts = [
    events.pending > 0 && `${events.pending} event${events.pending === 1 ? '' : 's'} waiting to run${events.retrying > 0 ? ` (${events.retrying} being retried)` : ''}`,
    delayed.waiting > 0 && `${delayed.waiting} run${delayed.waiting === 1 ? '' : 's'} waiting on a "Wait" step${delayed.overdue > 0 ? ` (${delayed.overdue} due now)` : ''}`,
  ].filter(Boolean)
  return (
    <p role="status" className={`mb-4 rounded-xl px-3 py-2 text-sm ${problem ? 'bg-warning/10 text-heading' : 'bg-background text-muted'}`}>
      {parts.length ? `${parts.join(' · ')}.${problem ? ' Some are taking longer than usual; they retry on their own.' : ''}` : 'All caught up: nothing is waiting to run.'}
    </p>
  )
}

export function WorkflowsPage() {
  const { data, isPending, isFetching, isError, error, refetch } = useWorkflows()
  const toggle = useToggleWorkflow()
  const remove = useDeleteWorkflow()
  const runAsMe = useRunAsMe()

  const handleToggle = (w: Workflow) =>
    toggle.mutate({ id: w.id, isActive: !w.isActive }, { onSuccess: () => toast.success(w.isActive ? 'Workflow paused' : 'Workflow resumed'), onError: (e) => toast.error(e.message) })

  const handleDelete = async (w: Workflow) => {
    if (!(await confirmDialog(`Delete the workflow "${w.name}"? It stops running straight away. Tasks and notifications it already created are kept.`, { title: 'Delete workflow?' }))) return
    remove.mutate(w.id, { onSuccess: () => toast.success('Workflow deleted'), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<Workflow>[] = [
    {
      key: 'name',
      header: 'Workflow',
      primary: true,
      cell: (w) => (
        <>
          <div className="font-medium text-heading">{w.name}</div>
          <div className="mt-1 text-xs text-muted">
            When: {triggerLabel(w.trigger)}
            {w.schedule && ` · ${w.schedule.day ? `${DAYS[w.schedule.day] ?? w.schedule.day}s ` : 'daily '}at ${w.schedule.at} ${w.schedule.timezone}`}
          </div>
          {w.runsAs?.problem && (
            <div className="mt-1 text-xs text-warning">
              {w.runsAs.problem === 'inactive' ? `${w.runsAs.creator?.name ?? 'Its creator'} was deactivated.` : 'Its creator was removed.'} It runs as {w.runsAs.willRunAs?.name ?? 'nobody'} for now.{' '}
              <button type="button" className="link-action" disabled={runAsMe.isPending} onClick={() => runAsMe.mutate(w.id, { onSuccess: () => toast.success('This workflow now runs as you'), onError: (e) => toast.error(e.message) })}>Run as me</button>
            </div>
          )}
        </>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      cell: (w) => (w.isActive ? <Badge tone="success">active</Badge> : w.consecutiveFailures >= AUTO_PAUSE_AFTER ? <Badge tone="danger">auto-paused</Badge> : <Badge tone="neutral">paused</Badge>),
    },
    { key: 'runs', header: 'Runs', align: 'right', cell: (w) => w.runCount },
    {
      key: 'last',
      header: 'Last run',
      cell: (w) => (
        <>
          <div>{w.lastRunAt ? format(parseISO(w.lastRunAt), 'd MMM yyyy, HH:mm') : 'Never'}</div>
          {w.lastError && (
            <div className="mt-1">
              <Badge tone="danger">failed</Badge> <span className="text-xs text-destructive">{w.lastError}</span>
              {w.consecutiveFailures > 1 && <div className="mt-0.5 text-xs text-muted">Failed {w.consecutiveFailures} times in a row{!w.isActive && w.consecutiveFailures >= AUTO_PAUSE_AFTER ? ' — paused automatically. Fix the step, then resume.' : '.'}</div>}
            </div>
          )}
        </>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Workflows"
        subtitle="Do something automatically — create a task or send a notification — when something changes."
        actions={<Link to="/settings/workflows/new" className="btn-primary"><Plus className="size-4" aria-hidden /> New workflow</Link>}
      />
      <TimezoneNote />
      <QueueNote />
      <DataTable
        caption="Workflows"
        columns={columns}
        rows={data}
        rowKey={(w) => w.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'No workflows yet.', hint: 'Create one, for example "when a deal is won, create an onboarding task".' }}
        actions={(w) => (
          <>
            <button type="button" className="link-action" disabled={toggle.isPending} onClick={() => handleToggle(w)}>{w.isActive ? 'Pause' : 'Resume'}</button>
            <Link to={`/settings/workflows/${w.id}/edit`} className="link-action">Edit</Link>
            <button type="button" className="link-danger" onClick={() => handleDelete(w)}>Delete</button>
          </>
        )}
      />
    </>
  )
}
