import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight, Download, FileImage, FileSpreadsheet, FileText, Pencil, Trash2, Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { confirmDialog, promptDialog } from '@/components/ui/ConfirmHost'
import { saveBlob } from '@/lib/download'
import type { ApiError } from '@/lib/httpClient'
import { downloadDocument } from '../api/documentsApi'
import { useDeleteDocument, useDocumentVersions, useRenameDocument, useUploadVersion } from '../hooks/useDocuments'
import { formatBytes, type DocumentItem } from '../types'
import { ACCEPT, extensionOf, fileProblem } from '../uploadRules'

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <FileImage className="size-5" aria-hidden />
  if (mime.includes('spreadsheet') || mime === 'text/csv') return <FileSpreadsheet className="size-5" aria-hidden />
  return <FileText className="size-5" aria-hidden />
}
const actionClass = 'btn-ghost min-h-11 gap-1.5 px-3 text-sm'
const when = (iso: string) => format(parseISO(iso), 'd MMM yyyy, HH:mm')

type Props = { doc: DocumentItem; canCreate: boolean; canDelete: boolean }

function Versions({ doc, canCreate }: { doc: DocumentItem; canCreate: boolean }) {
  const versions = useDocumentVersions(doc.id, true)
  const upload = useUploadVersion()
  const inputId = useId()
  const [percent, setPercent] = useState<number | null>(null)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  const save = async (version: number, fileName: string) => {
    setBusy(version)
    try {
      saveBlob(await downloadDocument(doc.id, version), fileName)
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setBusy(null)
    }
  }

  const onPick = async (file: File | undefined, reset: () => void) => {
    reset()
    if (!file) return
    const issue = fileProblem(file)
    setProblem(issue)
    if (issue) return
    setPercent(0)
    try {
      await upload.mutateAsync({ id: doc.id, file, onProgress: setPercent })
      toast.success('New version uploaded')
    } catch (e) {
      setProblem((e as ApiError).message)
    } finally {
      setPercent(null)
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-background/70 p-3" aria-label={`Versions of ${doc.name}`}>
      {versions.isPending ? (
        <p className="text-sm text-muted">Loading versions…</p>
      ) : versions.isError ? (
        <p role="alert" className="text-sm text-destructive">{versions.error.message}</p>
      ) : (
        <ol className="divide-y divide-border/60">
          {versions.data.versions.map((v) => (
            <li key={v.version} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="font-medium text-heading">Version {v.version}</span>
              {v.version === versions.data.currentVersion && <Badge tone="success">latest</Badge>}
              <span className="min-w-0 flex-1 truncate text-xs text-muted">
                {v.fileName} · {formatBytes(v.sizeBytes)} · {v.uploadedByName ?? 'Someone'} · {when(v.createdAt)}
              </span>
              <button type="button" className="link-action gap-1" disabled={busy === v.version} onClick={() => save(v.version, v.fileName)} aria-label={`Download version ${v.version} of ${doc.name}`}>
                <Download className="size-3.5" aria-hidden /> {busy === v.version ? 'Preparing…' : 'Download'}
              </button>
            </li>
          ))}
        </ol>
      )}
      {canCreate && (
        <div className="mt-3 space-y-2">
          <input id={inputId} type="file" accept={ACCEPT} className="peer sr-only" disabled={upload.isPending} onChange={(e) => onPick(e.target.files?.[0], () => (e.target.value = ''))} />
          <label htmlFor={inputId} className="btn-ghost min-h-11 cursor-pointer gap-1.5 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:opacity-60">
            <Upload className="size-4" aria-hidden /> {upload.isPending ? 'Uploading…' : 'Upload a new version'}
          </label>
          {percent !== null && <progress className="block h-2 w-full" max={100} value={percent} aria-label="Upload progress" />}
          {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
          <p className="text-xs text-muted">The new file becomes the one everyone gets. Older versions stay here.</p>
        </div>
      )}
    </div>
  )
}

export function DocumentRow({ doc, canCreate, canDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const rename = useRenameDocument()
  const remove = useDeleteDocument()
  const panelId = useId()

  const download = async () => {
    setDownloading(true)
    try {
      saveBlob(await downloadDocument(doc.id), doc.fileName)
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setDownloading(false)
    }
  }

  const handleRename = async () => {
    const next = (await promptDialog(`Choose a new name for "${doc.name}".`, { title: 'Rename document', inputLabel: 'Name', confirmLabel: 'Rename' }))?.trim()
    if (!next || next === doc.name) return
    if (next.length > 150) return void toast.error('Keep the name under 150 characters.')
    rename.mutate({ id: doc.id, name: next }, { onSuccess: () => toast.success('Document renamed'), onError: (e) => toast.error(e.message) })
  }

  const handleDelete = async () => {
    const removed = doc.currentVersion === 1 ? 'The file' : `All ${doc.currentVersion} versions of the file`
    if (!(await confirmDialog(`Delete "${doc.name}"? ${removed} will be removed and cannot be brought back.`, { title: 'Delete document?' }))) return
    remove.mutate(doc.id, { onSuccess: () => toast.success('Document deleted'), onError: (e) => toast.error(e.message) })
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><FileIcon mime={doc.mimeType} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-heading">{doc.name}</p>
          <p className="text-xs text-muted">
            {extensionOf(doc.fileName)} · {formatBytes(doc.sizeBytes)}
            {doc.currentVersion > 1 && ` · Version ${doc.currentVersion}`} · Added by {doc.uploadedByName ?? 'someone'} · {when(doc.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" className={actionClass} disabled={downloading} onClick={download} aria-label={`Download ${doc.name}`}>
            <Download className="size-4" aria-hidden /> {downloading ? 'Preparing…' : 'Download'}
          </button>
          <button type="button" className={actionClass} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} aria-label={`${open ? 'Hide' : 'Show'} versions of ${doc.name}`}>
            {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />} Versions
          </button>
          {canCreate && (
            <button type="button" className={actionClass} disabled={rename.isPending} onClick={handleRename} aria-label={`Rename ${doc.name}`}>
              <Pencil className="size-4" aria-hidden /> Rename
            </button>
          )}
          {canDelete && (
            <button type="button" className={`${actionClass} text-destructive`} disabled={remove.isPending} onClick={handleDelete} aria-label={`Delete ${doc.name}`}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </button>
          )}
        </div>
      </div>
      <div id={panelId}>{open && <Versions doc={doc} canCreate={canCreate} />}</div>
    </li>
  )
}
