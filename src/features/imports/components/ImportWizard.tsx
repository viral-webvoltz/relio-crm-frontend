import { CheckCircle2, Download, Loader2, TriangleAlert, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { saveBlob } from '@/lib/download'
import { cn } from '@/lib/utils'
import { downloadImportErrors, IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, type ImportResource, type Mapping, type Preview } from '../api/importsApi'
import { useCommitImport, useImportJob, usePreviewImport, useValidateImport } from '../hooks/useImport'

const steps = ['Upload', 'Match columns', 'Check', 'Import'] as const

const label = (field: string) => field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
// Fields whose meaning isn't obvious from the name.
const hints: Record<string, string> = {
  priceMinor: 'In the smallest currency unit, e.g. 1999 means 19.99.',
  assignedTo: 'The ID of the user it is assigned to.',
  companyId: 'The ID of an existing company.',
  categoryId: 'The ID of an existing category.',
  relatedId: 'The ID of the linked record.',
  followUpDate: 'Format: YYYY-MM-DD.',
  dueDate: 'Format: YYYY-MM-DD.',
}

type Props = { resource: ImportResource; noun?: string; onClose: () => void }

const Problem = ({ message }: { message: string }) => (
  <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>
)

export function ImportWizard({ resource, noun = resource, onClose }: Props) {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [mapping, setMapping] = useState<Mapping>({})
  const [jobId, setJobId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const previewMutation = usePreviewImport(resource)
  const validate = useValidateImport(resource)
  const commit = useCommitImport(resource)
  const job = useImportJob(resource, jobId)

  const chooseFile = (picked: File | undefined) => {
    setFileError('')
    previewMutation.reset()
    if (!picked) return setFile(null)
    if (picked.size > IMPORT_MAX_BYTES) {
      setFile(null)
      return setFileError(`That file is ${(picked.size / 1024 / 1024).toFixed(1)} MB. The limit is ${IMPORT_MAX_BYTES / 1024 / 1024} MB.`)
    }
    setFile(picked)
  }

  const upload = () => {
    if (!file) return
    previewMutation.mutate(file, {
      onSuccess: (result) => {
        setPreview(result)
        setMapping(result.suggestedMapping)
        validate.reset()
        setStep(1)
      },
    })
  }

  // Only fields with a chosen column are sent.
  const mapped: Mapping = Object.fromEntries(Object.entries(mapping).filter(([, column]) => column))
  const mappedCount = Object.keys(mapped).length

  const check = () => {
    if (file) validate.mutate({ file, mapping: mapped }, { onSuccess: () => setStep(2) })
  }
  const start = () => {
    if (!file) return
    commit.mutate(
      { file, mapping: mapped },
      {
        onSuccess: (id) => {
          setJobId(id)
          setStep(3)
        },
      },
    )
  }

  const errorsFile = async () => {
    if (!jobId) return
    setDownloading(true)
    try {
      const { blob, fileName } = await downloadImportErrors(jobId)
      saveBlob(blob, fileName)
    } finally {
      setDownloading(false)
    }
  }

  const finished = job.data?.status === 'done' || job.data?.status === 'failed'

  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Import {noun}</h2>
        <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Progress">
          {steps.map((name, index) => (
            <li
              key={name}
              aria-current={index === step ? 'step' : undefined}
              className={cn('flex items-center gap-2', index === step ? 'font-semibold text-primary' : index < step ? 'text-heading' : 'text-muted')}
            >
              <span className={cn('grid size-6 place-items-center rounded-full text-xs', index <= step ? 'bg-primary text-white' : 'bg-background ring-1 ring-border')}>
                {index < step ? '✓' : index + 1}
              </span>
              {name}
            </li>
          ))}
        </ol>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-body">
            Upload a CSV file with a header row. Up to {IMPORT_MAX_ROWS.toLocaleString()} rows and {IMPORT_MAX_BYTES / 1024 / 1024} MB, saved as UTF-8.
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center hover:border-primary hover:bg-primary-soft">
            <Upload className="size-6 text-muted" aria-hidden />
            <span className="text-sm font-medium text-heading">{file ? file.name : 'Choose a CSV file'}</span>
            <span className="text-xs text-muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'Click to browse'}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])} />
          </label>
          {fileError && <Problem message={fileError} />}
          {previewMutation.error && <Problem message={previewMutation.error.message} />}
        </div>
      )}

      {step === 1 && preview && (
        <div className="space-y-4">
          <p className="text-sm text-body">
            We found <b className="text-heading">{preview.totalRows.toLocaleString()}</b> rows. Choose which column fills each field, or leave a field on “Don’t import” to skip it.
          </p>
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {preview.fields.map((field) => (
              <div key={field} className="grid items-start gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3">
                <label htmlFor={`map-${field}`} className="pt-2.5 text-sm font-medium text-heading">{label(field)}</label>
                <div>
                  <Select id={`map-${field}`} value={mapping[field] ?? ''} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}>
                    <option value="">Don’t import</option>
                    {preview.columns.map((column) => <option key={column} value={column}>{column}</option>)}
                  </Select>
                  {hints[field] && <p className="mt-1 text-xs text-muted">{hints[field]}</p>}
                </div>
              </div>
            ))}
          </div>
          <details className="text-sm">
            <summary className="rounded-lg px-1 py-1 text-primary">Preview first rows</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">First rows of the file</caption>
                <thead>
                  <tr>{preview.columns.map((c) => <th key={c} scope="col" className="whitespace-nowrap px-2 py-1 font-medium text-muted">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.sampleRows.map((row, i) => (
                    <tr key={i} className="border-t border-border/60">
                      {preview.columns.map((c, j) => <td key={c} className="whitespace-nowrap px-2 py-1">{row[j]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          {mappedCount === 0 && <p className="text-sm text-warning">Match at least one column to continue.</p>}
          {validate.error && <Problem message={validate.error.message} />}
        </div>
      )}

      {step === 2 && validate.data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-success/10 p-4 text-success">
              <p className="flex items-center gap-2 text-2xl font-semibold"><CheckCircle2 className="size-5" aria-hidden />{validate.data.valid.toLocaleString()}</p>
              <p className="text-sm">rows are ready to import</p>
            </div>
            <div className={cn('rounded-xl p-4', validate.data.invalidCount ? 'bg-warning/10 text-warning' : 'bg-background text-muted')}>
              <p className="flex items-center gap-2 text-2xl font-semibold"><TriangleAlert className="size-5" aria-hidden />{validate.data.invalidCount.toLocaleString()}</p>
              <p className="text-sm">rows have problems and will be skipped</p>
            </div>
          </div>
          {validate.data.invalidCount > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border/70">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Rows with problems</caption>
                <thead className="sticky top-0 bg-surface text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Row</th>
                    <th scope="col" className="px-3 py-2 font-medium">What to fix</th>
                  </tr>
                </thead>
                <tbody>
                  {validate.data.invalid.map((item) => (
                    <tr key={item.row} className="border-t border-border/60 align-top">
                      <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium text-heading">Row {item.row}</th>
                      <td className="px-3 py-2 text-body">{item.errors.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validate.data.truncated && (
                <p className="border-t border-border/60 px-3 py-2 text-xs text-muted">
                  Showing the first {validate.data.invalid.length} problems. After importing you can download the full list.
                </p>
              )}
            </div>
          )}
          {validate.data.valid === 0 && <Problem message="No rows can be imported. Go back, fix the file or the column matching, and try again." />}
          {commit.error && <Problem message={commit.error.message} />}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4" aria-live="polite">
          {!finished ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-heading">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Importing… you can keep this window open.
              </p>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.data?.progress ?? 0} aria-label="Import progress" className="h-2 overflow-hidden rounded-full bg-background">
                <div className="h-full bg-primary transition-all" style={{ width: `${job.data?.progress ?? 0}%` }} />
              </div>
            </div>
          ) : job.data?.status === 'failed' ? (
            <Problem message={job.data.error ?? 'The import failed.'} />
          ) : (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-base font-semibold text-heading">
                <CheckCircle2 className="size-5 text-success" aria-hidden /> Import finished
              </p>
              <p className="text-sm text-body">
                <b className="text-heading">{job.data?.created ?? 0}</b> of {job.data?.total ?? 0} rows were added
                {job.data?.failed ? <>, <b className="text-heading">{job.data.failed}</b> could not be added.</> : '.'}
              </p>
              {job.data?.hasErrorFile && (
                <Button variant="ghost" onClick={errorsFile} disabled={downloading}>
                  <Download className="size-4" aria-hidden /> Download the rows that failed
                </Button>
              )}
            </div>
          )}
          {job.error && <Problem message={job.error.message} />}
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
        <div>{step > 0 && step < 3 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}</div>
        <div className="flex gap-2">
          {(step < 3 || finished) && <Button variant="ghost" onClick={onClose}>{step === 3 ? 'Close' : 'Cancel'}</Button>}
          {step === 0 && <Button onClick={upload} disabled={!file || previewMutation.isPending}>{previewMutation.isPending ? 'Reading file…' : 'Continue'}</Button>}
          {step === 1 && <Button onClick={check} disabled={mappedCount === 0 || validate.isPending}>{validate.isPending ? 'Checking…' : 'Check file'}</Button>}
          {step === 2 && validate.data && (
            <Button onClick={start} disabled={validate.data.valid === 0 || commit.isPending}>
              {commit.isPending ? 'Starting…' : `Import ${validate.data.valid.toLocaleString()} rows`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
