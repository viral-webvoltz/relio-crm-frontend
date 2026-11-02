import { Bookmark } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { promptDialog } from '@/components/ui/ConfirmHost'
import { ErrorState, PageSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { ReportRangePicker } from '../components/ReportRangePicker'
import { ReportView } from '../components/ReportView'
import { SavedReports } from '../components/SavedReports'
import { Schedules } from '../components/Schedules'
import { useCreateSavedReport, useReport, useSavedReports, useUpdateSavedReport } from '../hooks/useReports'
import { periodText } from '../text'
import { reportMeta, reportTypes, type ReportRange, type ReportType, type SavedReport } from '../types'

const TABS = [
  { key: 'report', label: 'Reports' },
  { key: 'saved', label: 'Saved reports' },
  { key: 'schedules', label: 'Email schedules' },
] as const
type Tab = (typeof TABS)[number]['key']

// Report type, period, tab and the saved report being edited all live in the URL, so a view can be reloaded or shared.
export function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const { data: user, isPending: userPending } = useCurrentUser()
  const create = useCreateSavedReport()
  const update = useUpdateSavedReport()
  const saved = useSavedReports()
  const [scheduleFor, setScheduleFor] = useState<string | null>(null)
  const clearScheduleFor = useCallback(() => setScheduleFor(null), [])

  const canView = (type: ReportType) => user?.permissions.includes(reportMeta[type].permission) ?? false
  const allowed = reportTypes.filter(canView)
  const tab: Tab = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'report'
  const type = allowed.find((t) => t === params.get('report')) ?? allowed[0]
  const range: ReportRange = { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined }
  const editing = saved.data?.find((r) => r.id === params.get('saved') && r.reportType === type)

  const patch = (changes: Record<string, string | undefined>) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    })
  const goTo = (next: Tab) => patch({ tab: next === 'report' ? undefined : next })

  const report = useReport(tab === 'report' ? type : undefined, range)

  if (userPending) return <PageSkeleton />
  if (allowed.length === 0) {
    return (
      <>
        <PageHeader title="Reports" subtitle="Numbers for your business, ready to read or email." />
        <p className="card p-8 text-sm text-muted">Your role can't view any reports. Ask an administrator if you need access.</p>
      </>
    )
  }

  const saveCurrent = async () => {
    if (!type) return
    const name = (await promptDialog(`Give this report a name. It saves “${reportMeta[type].label}” for ${periodText(range).toLowerCase()}.`, { title: 'Save this report', inputLabel: 'Name', confirmLabel: 'Save' }))?.trim()
    if (!name) return
    if (name.length > 80) return void toast.error('Use 80 characters or fewer.')
    create.mutate({ name, reportType: type, params: range }, { onSuccess: () => toast.success('Report saved'), onError: (e) => toast.error(e.code === 'SAVED_REPORT_LIMIT' ? 'You have reached the limit of 50 saved reports. Delete one first.' : e.message) })
  }

  const openSaved = (r: SavedReport) => setParams({ report: r.reportType, saved: r.id, ...(r.params.from && { from: r.params.from }), ...(r.params.to && { to: r.params.to }) })

  const updateSaved = () => {
    if (!editing) return
    update.mutate({ id: editing.id, changes: { params: range } }, { onSuccess: () => toast.success(`“${editing.name}” now uses this period`), onError: (e) => toast.error(e.message) })
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Numbers for your business, ready to read or email." />

      <div role="tablist" aria-label="Reports sections" className="mb-5 flex overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => goTo(t.key)} className={cn('min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-medium', tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-heading')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'report' && type && (
        <div role="tabpanel" aria-label="Reports" className="space-y-5">
          <div role="group" aria-label="Choose a report" className="flex flex-wrap gap-2">
            {allowed.map((t) => (
              <button key={t} type="button" aria-pressed={t === type} onClick={() => patch({ report: t, saved: undefined })} className={cn('btn-ghost h-11', t === type && 'border-primary bg-primary-soft text-primary')}>
                {reportMeta[t].label}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">{reportMeta[type].blurb}</p>

          <ReportRangePicker value={range} onChange={(r) => patch({ from: r.from, to: r.to })} />

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-ghost h-11 gap-1.5" disabled={create.isPending} onClick={saveCurrent}>
              <Bookmark className="size-4" aria-hidden /> Save this report
            </button>
            {editing && (
              <>
                <span className="text-sm text-muted">Opened from “{editing.name}”.</span>
                <button type="button" className="link-action" disabled={update.isPending} onClick={updateSaved}>Use this period for “{editing.name}”</button>
                <button type="button" className="link-action" onClick={() => patch({ saved: undefined })}>Stop editing</button>
              </>
            )}
          </div>

          <div className={cn('transition-opacity', report.isFetching && !report.isPending && 'opacity-60')} aria-live="polite" aria-busy={report.isFetching}>
            {report.isPending ? (
              <TableSkeleton rows={4} />
            ) : report.isError ? (
              <div className="card"><ErrorState message={report.error.message} onRetry={() => report.refetch()} /></div>
            ) : (
              <ReportView output={report.data} />
            )}
          </div>
        </div>
      )}

      {tab === 'saved' && (
        <div role="tabpanel" aria-label="Saved reports">
          <SavedReports
            canView={canView}
            onOpen={openSaved}
            onSchedule={(r) => {
              setScheduleFor(r.id)
              goTo('schedules')
            }}
          />
        </div>
      )}

      {tab === 'schedules' && (
        <div role="tabpanel" aria-label="Email schedules">
          <Schedules canView={canView} startFor={scheduleFor} onStarted={clearScheduleFor} />
        </div>
      )}
    </>
  )
}
