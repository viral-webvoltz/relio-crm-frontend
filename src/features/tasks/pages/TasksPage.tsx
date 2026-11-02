import { Select } from '@/components/ui/Select'
import { addMonths, format, parse, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ListTools } from '@/components/layout/ListTools'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type BulkAction, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { SearchForm } from '@/components/ui/SearchForm'
import { ErrorState, TableSkeleton } from '@/components/ui/Skeleton'
import { relatedRoutes } from '@/features/activities/types'
import { useCan } from '@/features/auth/hooks/useCan'
import { useBatch, useUndoToast } from '@/lib/useBatch'
import { useListParams } from '@/lib/useListParams'
import { useRowSelection } from '@/lib/useRowSelection'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { DueDate } from '../components/DueDate'
import { TaskCalendar, calendarRange } from '../components/TaskCalendar'
import { useDeleteTask, useSetTaskStatus, useTasks } from '../hooks/useTasks'
import type { Task } from '../types'


// "2026-10" -> first of that month; anything invalid falls back to the current month.
function parseMonth(value: string | null) {
  const parsed = value ? parse(value, 'yyyy-MM', new Date()) : new Date(Number.NaN)
  return startOfMonth(Number.isNaN(parsed.getTime()) ? new Date() : parsed)
}

export function TasksPage() {
  const setStatus = useSetTaskStatus()
  const deleteTask = useDeleteTask()
  const undoToast = useUndoToast()
  const canCreate = useCan('tasks.create')
  const canUpdate = useCan('tasks.update')
  const canDelete = useCan('tasks.delete')
  const { data: me } = useCurrentUser()

  const handleToggle = (task: Task) =>
    setStatus.mutate({ id: task.id, status: task.status === 'done' ? 'open' : 'done' }, { onError: (e) => toast.error(e.message) })

  const handleDelete = async (task: Task) => {
    if (!(await confirmDialog(`Delete task "${task.title}"?`))) return
    deleteTask.mutate(task.id, { onSuccess: () => undoToast('tasks', task.id, 'Task'), onError: (e) => toast.error(e.message) })
  }

  const columns: Column<Task>[] = [
    {
      key: 'task',
      header: 'Task',
      sortKey: 'title',
      primary: true,
      cell: (task) => {
        const isDone = task.status === 'done'
        return (
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-primary"
              checked={isDone}
              disabled={!canUpdate || setStatus.isPending}
              onChange={() => handleToggle(task)}
              aria-label={`Mark "${task.title}" as ${isDone ? 'open' : 'done'}`}
            />
            <div className="min-w-0">
              <div className={cn(isDone ? 'text-muted line-through' : 'font-medium text-heading')}>{task.title}</div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                {task.recurrence !== 'none' && <span className="inline-flex items-center gap-1"><Repeat className="size-3" aria-hidden /> Repeats {task.recurrence}</span>}
                {task.relatedType && task.relatedId && (
                  <Link to={`${relatedRoutes[task.relatedType]}/${task.relatedId}/edit`} className="capitalize text-primary hover:underline">Linked {task.relatedType}</Link>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    { key: 'due', header: 'Due', sortKey: 'dueDate', cell: (task) => <DueDate dueDate={task.dueDate} isDone={task.status === 'done'} /> },
    { key: 'priority', header: 'Priority', sortKey: 'priority', cell: (task) => <StatusBadge domain="priority" status={task.priority} /> },
    { key: 'assignee', header: 'Assignee', sortKey: 'assignee', cell: (task) => task.assigneeName ?? '—' },
  ]

  const { params, searchParams, update } = useListParams(columns)
  const view = searchParams.get('view') === 'calendar' ? 'calendar' : 'list'
  const month = parseMonth(searchParams.get('month'))
  const status = searchParams.get('status') ?? 'open'
  const assignee = searchParams.get('assignee') ?? ''
  const filtered = Boolean(params.search || assignee || status !== 'open')

  // The calendar shows every status in its grid range; the list is paginated and sortable.
  const range = calendarRange(month)
  const query =
    view === 'calendar'
      ? { ...params, status: 'all', assignee, page: 1, limit: 100, sort: undefined, dir: undefined, dueFrom: format(range.start, 'yyyy-MM-dd'), dueTo: format(range.end, 'yyyy-MM-dd') }
      : { ...params, status, assignee }
  const { data, isPending, isFetching, isError, error, refetch } = useTasks(query)
  const { selected, setSelected } = useRowSelection(data?.data, (task) => task.id)
  const batch = useBatch('tasks', ['task', 'tasks'], (id) => data?.data.find((t) => t.id === id)?.title ?? id)
  const bulkActions: BulkAction[] = [
    ...(canUpdate ? [{ label: 'Mark done', busy: batch.busy, run: (ids: string[]) => batch.run(ids, { action: 'update', changes: { status: 'done' } }, 'marked done') }] : []),
    ...(canUpdate && me ? [{ label: 'Assign to me', busy: batch.busy, run: (ids: string[]) => batch.run(ids, { action: 'update', changes: { assignedTo: me.id } }, 'assigned to you') }] : []),
    ...(canDelete ? [{ label: 'Delete', danger: true, busy: batch.busy, run: (ids: string[]) => batch.run(ids, { action: 'delete' }) }] : []),
  ]

  const goToMonth = (next: Date) => update({ month: format(next, 'yyyy-MM') })
  const setView = (option: 'list' | 'calendar') =>
    update(option === 'calendar' ? { view: 'calendar', month: format(month, 'yyyy-MM') } : { view: null, month: null })

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Follow-ups and to-dos across your records."
        actions={
          canCreate && (
            <Link to="/tasks/new" className="btn-primary">
              <Plus className="size-4" aria-hidden /> New task
            </Link>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchForm defaultValue={params.search} placeholder="Search tasks" onSearch={(search) => update({ search })} />
        {view === 'list' && (
          <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value === 'open' ? null : e.target.value })} className="input-base w-auto">
            <option value="open">Open</option>
            <option value="done">Done</option>
            <option value="all">All</option>
          </Select>
        )}
        <Select aria-label="Filter by assignee" value={assignee} onChange={(e) => update({ assignee: e.target.value })} className="input-base w-auto">
          <option value="">Everyone</option>
          <option value="me">Assigned to me</option>
        </Select>
        <div className="ml-auto flex gap-2" role="group" aria-label="View">
          {(['list', 'calendar'] as const).map((option) => (
            <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={cn('btn-ghost capitalize', view === option && 'border-primary bg-primary-soft text-primary')}>
              {option}
            </button>
          ))}
        </div>
        <ListTools resource="tasks" importable="tasks" />
      </div>

      <FilterChips
        chips={[
          params.search && { label: `Search: “${params.search}”`, onRemove: () => update({ search: '' }) },
          view === 'list' && status !== 'open' && { label: `Status: ${status}`, onRemove: () => update({ status: null }) },
          assignee && { label: 'Assigned to me', onRemove: () => update({ assignee: '' }) },
        ]}
        onClear={() => update({ search: '', status: '', assignee: '' })}
      />

      {view === 'calendar' ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <Button variant="ghost" aria-label="Previous month" onClick={() => goToMonth(addMonths(month, -1))}><ChevronLeft className="size-4" aria-hidden /></Button>
            <h2 className="min-w-36 text-center text-base font-semibold text-heading">{format(month, 'MMMM yyyy')}</h2>
            <Button variant="ghost" aria-label="Next month" onClick={() => goToMonth(addMonths(month, 1))}><ChevronRight className="size-4" aria-hidden /></Button>
            <Button variant="ghost" onClick={() => goToMonth(new Date())}>Today</Button>
          </div>
          {isPending ? (
            <div className="card"><TableSkeleton /></div>
          ) : isError ? (
            <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>
          ) : (
            <>
              <TaskCalendar month={month} tasks={data.data} canEdit={canUpdate} />
              <p className="mt-2 text-xs text-muted">Tasks without a due date are not shown here.{data.meta.total > data.data.length && ' Some tasks in this range are hidden; narrow the filters.'}</p>
            </>
          )}
        </>
      ) : (
        <DataTable
          caption="Tasks"
          columns={columns}
        columnsPref="tasks"
          rows={data?.data}
          rowKey={(task) => task.id}
          loading={isPending}
          refreshing={isFetching}
          error={isError ? error : null}
          onRetry={() => refetch()}
          empty={{
            title: filtered ? 'No tasks match your filters.' : 'Nothing to do — you are all caught up.',
            hint: filtered ? 'Try a different search or clear the filters.' : 'New tasks you create will show up here.',
          }}
          sort={params}
          onSortChange={(sort, dir) => update({ sort, dir })}
          actions={(task) => (
            <>
              {canUpdate && <Link to={`/tasks/${task.id}/edit`} className="link-action">Edit</Link>}
              {canDelete && <button type="button" className="link-danger" onClick={() => handleDelete(task)}>Delete</button>}
            </>
          )}
          rowLabel={(task) => task.title}
          selection={bulkActions.length > 0 ? { selected, onChange: setSelected, noun: 'tasks', bulkActions } : undefined}
          meta={data?.meta}
          onPageChange={(page) => update({ page })}
          onPageSizeChange={(limit) => update({ limit })}
        />
      )}
    </>
  )
}
