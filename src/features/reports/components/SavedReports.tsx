import { format, parseISO } from 'date-fns'
import { X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { confirmDialog, promptDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ErrorState, TableSkeleton } from '@/components/ui/Skeleton'
import { useDeleteSavedReport, useRunSavedReport, useSavedReports, useUpdateSavedReport } from '../hooks/useReports'
import { periodText } from '../text'
import { reportMeta, type ReportType, type SavedReport } from '../types'
import { ReportView } from './ReportView'

type Props = {
  canView: (type: ReportType) => boolean
  onOpen: (saved: SavedReport) => void
  onSchedule: (saved: SavedReport) => void
}

function SavedRun({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const run = useRunSavedReport(id)
  return (
    <section className="mt-6" aria-label={`Results for ${name}`} aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-heading">{name}</h2>
        <button type="button" aria-label="Close results" onClick={onClose} className="grid size-11 place-items-center rounded-lg text-muted hover:bg-background"><X className="size-4" aria-hidden /></button>
      </div>
      {run.isPending ? <TableSkeleton rows={4} /> : run.isError ? <div className="card"><ErrorState message={run.error.message} onRetry={() => run.refetch()} /></div> : <ReportView output={run.data} />}
    </section>
  )
}

// A saved report is a name plus a report type and a period. Running one always uses the latest data.
export function SavedReports({ canView, onOpen, onSchedule }: Props) {
  const { data, isPending, isFetching, isError, error, refetch } = useSavedReports()
  const update = useUpdateSavedReport()
  const remove = useDeleteSavedReport()
  const [runId, setRunId] = useState<string | null>(null)
  const running = data?.find((r) => r.id === runId)

  const rename = async (report: SavedReport) => {
    const name = (await promptDialog('Choose a new name for this report.', { title: 'Rename report', inputLabel: 'Name', confirmLabel: 'Rename' }))?.trim()
    if (!name || name === report.name) return
    if (name.length > 80) return void toast.error('Use 80 characters or fewer.')
    update.mutate({ id: report.id, changes: { name } }, { onSuccess: () => toast.success('Report renamed'), onError: (e) => toast.error(e.message) })
  }

  const handleDelete = async (report: SavedReport) => {
    if (!(await confirmDialog(`Delete the saved report "${report.name}"? Any email schedules for it are deleted too. The report itself is just a saved setting, so your data is not affected.`, { title: 'Delete saved report?' }))) return
    remove.mutate(report.id, {
      onSuccess: () => {
        if (runId === report.id) setRunId(null)
        toast.success('Saved report deleted')
      },
      onError: (e) => toast.error(e.message),
    })
  }

  const columns: Column<SavedReport>[] = [
    { key: 'name', header: 'Name', primary: true, cell: (r) => <span className="font-medium text-heading">{r.name}</span> },
    { key: 'type', header: 'Report', cell: (r) => reportMeta[r.reportType]?.label ?? r.reportType },
    { key: 'period', header: 'Period', cell: (r) => periodText(r.params) },
    { key: 'updated', header: 'Last changed', cell: (r) => <span className="text-muted">{format(parseISO(r.updatedAt), 'd MMM yyyy')}</span> },
  ]

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted">Save a report once, then open it again any time. Saved reports are private to you.</p>
      <DataTable
        caption="Saved reports"
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ title: 'No saved reports yet.', hint: 'Open a report, choose a period, then press “Save this report”.' }}
        actions={(r) => (
          <>
            {canView(r.reportType) ? (
              <>
                <button type="button" className="link-action" aria-pressed={runId === r.id} onClick={() => setRunId(runId === r.id ? null : r.id)}>{runId === r.id ? 'Hide' : 'Run'}</button>
                <button type="button" className="link-action" onClick={() => onOpen(r)}>Open</button>
                <button type="button" className="link-action" onClick={() => onSchedule(r)}>Email it</button>
              </>
            ) : (
              <span className="text-xs text-muted">Your role can't view this report</span>
            )}
            <button type="button" className="link-action" disabled={update.isPending} onClick={() => rename(r)}>Rename</button>
            <button type="button" className="link-danger" onClick={() => handleDelete(r)}>Delete</button>
          </>
        )}
      />
      {running && <SavedRun id={running.id} name={running.name} onClose={() => setRunId(null)} />}
    </>
  )
}
