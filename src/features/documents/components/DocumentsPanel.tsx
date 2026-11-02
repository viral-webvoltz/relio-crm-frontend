import { AlertTriangle, UploadCloud } from 'lucide-react'
import { useId, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import type { ApiError } from '@/lib/httpClient'
import { cn } from '@/lib/utils'
import { useDocuments, useStorage, useUploadDocument } from '../hooks/useDocuments'
import { formatBytes, type DocumentEntityType } from '../types'
import { ACCEPT, fileProblem, TYPE_LIST } from '../uploadRules'
import { DocumentRow } from './DocumentRow'

export type DocumentsPanelProps = {
  entityType: DocumentEntityType
  entityId: string
  title?: string
}

function StorageNote({ enabled }: { enabled: boolean }) {
  const storage = useStorage(enabled)
  if (!storage.data) return null
  const { usedBytes, limitBytes } = storage.data
  const percent = Math.min(100, Math.round((usedBytes / limitBytes) * 100))
  const nearly = percent >= 90
  return (
    <p className={cn('flex items-center gap-1.5 text-xs', nearly ? 'font-medium text-warning' : 'text-muted')}>
      {nearly && <AlertTriangle className="size-3.5" aria-hidden />}
      {percent >= 100 ? 'Your document storage is full.' : nearly ? 'Your document storage is almost full.' : 'Storage used:'} {formatBytes(usedBytes)} of {formatBytes(limitBytes)} ({percent}%)
    </p>
  )
}

// Files attached to one record (contact, deal, ticket...), with versions. What a person sees follows the permission for that record.
export function DocumentsPanel({ entityType, entityId, title = 'Documents' }: DocumentsPanelProps) {
  const canView = useCan('documents.view')
  const canCreate = useCan('documents.create')
  const canDelete = useCan('documents.delete')
  const docs = useDocuments(entityType, entityId, canView)
  const upload = useUploadDocument()
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<{ index: number; total: number; percent: number } | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [status, setStatus] = useState('')

  if (!canView) return null

  // One at a time, so a failure on one file does not stop the others and the progress is easy to follow.
  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || progress) return
    const failed: string[] = []
    let done = 0
    setStatus('')
    for (const [index, file] of files.entries()) {
      const issue = fileProblem(file)
      if (issue) {
        failed.push(`${file.name}: ${issue}`)
        continue
      }
      setProgress({ index: index + 1, total: files.length, percent: 0 })
      try {
        await upload.mutateAsync({ entityType, entityId, file, onProgress: (percent) => setProgress({ index: index + 1, total: files.length, percent }) })
        done += 1
      } catch (e) {
        failed.push(`${file.name}: ${(e as ApiError).message}`)
      }
    }
    setProgress(null)
    setProblems(failed)
    if (done > 0) {
      const message = done === 1 ? 'Document uploaded' : `${done} documents uploaded`
      setStatus(message)
      toast.success(message)
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    if (canCreate) void uploadFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <section className="card mt-6 space-y-4 p-6" aria-labelledby={`${inputId}-title`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${inputId}-title`} className="text-base font-semibold text-heading">
          {title} {docs.data && <span className="ml-1 text-sm font-normal text-muted">{docs.data.length}</span>}
        </h2>
        <StorageNote enabled={canView} />
      </div>

      {canCreate && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn('rounded-2xl border-2 border-dashed p-5 text-center transition-colors', dragging ? 'border-primary bg-primary-soft' : 'border-border')}
        >
          <input id={inputId} type="file" multiple accept={ACCEPT} className="peer sr-only" disabled={Boolean(progress)} onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          <UploadCloud className="mx-auto mb-2 size-7 text-muted" aria-hidden />
          <label htmlFor={inputId} className="btn-primary min-h-11 cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:opacity-60">
            {progress ? 'Uploading…' : 'Choose files'}
          </label>
          <p className="mt-2 text-sm text-muted">or drop them here. {TYPE_LIST}, up to 10 MB each.</p>
          {progress && (
            <div className="mx-auto mt-3 max-w-xs space-y-1">
              <progress className="block h-2 w-full" max={100} value={progress.percent} aria-label="Upload progress" />
              <p className="text-xs text-muted">File {progress.index} of {progress.total} · {progress.percent}%</p>
            </div>
          )}
        </div>
      )}

      <div aria-live="polite">{status && <p className="text-sm text-success">{status}</p>}</div>
      {problems.length > 0 && (
        <div role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p className="font-medium">{problems.length === 1 ? 'One file was not uploaded:' : `${problems.length} files were not uploaded:`}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      {docs.isPending ? (
        <p className="text-sm text-muted">Loading documents…</p>
      ) : docs.isError ? (
        <ErrorState message={docs.error.message} onRetry={() => docs.refetch()} />
      ) : docs.data.length === 0 ? (
        <p className="text-sm text-muted">{canCreate ? 'No documents yet. Add contracts, proposals or anything else that belongs with this record.' : 'No documents yet.'}</p>
      ) : (
        <ul className="divide-y divide-border/70" aria-label={title}>
          {docs.data.map((doc) => <DocumentRow key={doc.id} doc={doc} canCreate={canCreate} canDelete={canDelete} />)}
        </ul>
      )}
    </section>
  )
}
