import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Task } from '../types'

const maxPerDay = 3
const weekOptions = { weekStartsOn: 1 } as const

// The visible grid also shows days from the neighbouring months, so tasks are fetched for the whole grid.
export function calendarRange(month: Date) {
  return { start: startOfWeek(startOfMonth(month), weekOptions), end: endOfWeek(endOfMonth(month), weekOptions) }
}

export function TaskCalendar({ month, tasks, canEdit }: { month: Date; tasks: Task[]; canEdit: boolean }) {
  const { start, end } = calendarRange(month)
  const days = eachDayOfInterval({ start, end })
  const byDay = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.dueDate) byDay.set(task.dueDate, [...(byDay.get(task.dueDate) ?? []), task])
  }

  return (
    <div className="card overflow-x-auto">
      <div className="grid min-w-[44rem] grid-cols-7 border-b border-border/60 bg-background/70 text-xs font-medium uppercase tracking-wide text-muted">
        {days.slice(0, 7).map((day) => (
          <div key={day.toISOString()} className="px-3 py-2">{format(day, 'EEE')}</div>
        ))}
      </div>
      <div className="grid min-w-[44rem] grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = byDay.get(key) ?? []
          return (
            <div key={key} className={cn('min-h-28 border-b border-r border-border/50 p-1.5', !isSameMonth(day, month) && 'bg-background/60')}>
              <div className={cn('mb-1 flex size-6 items-center justify-center rounded-full text-xs', isToday(day) ? 'bg-primary font-semibold text-white' : 'text-muted')}>
                {format(day, 'd')}
              </div>
              <ul className="space-y-1">
                {dayTasks.slice(0, maxPerDay).map((task) => {
                  const chip = cn(
                    'block truncate rounded-md px-1.5 py-0.5 text-xs',
                    task.status === 'done' ? 'bg-background text-muted line-through' : 'bg-primary-soft text-primary',
                  )
                  return (
                    <li key={task.id}>
                      {canEdit ? <Link to={`/tasks/${task.id}/edit`} className={cn(chip, 'hover:opacity-80')} title={task.title}>{task.title}</Link> : <span className={chip} title={task.title}>{task.title}</span>}
                    </li>
                  )
                })}
                {dayTasks.length > maxPerDay && <li className="px-1.5 text-xs text-muted">+{dayTasks.length - maxPerDay} more</li>}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
