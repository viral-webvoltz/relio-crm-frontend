import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Field } from '@/components/ui/Field'
import { describedBy, FieldLabel, FieldMessages, useFieldIds } from '@/components/ui/FieldParts'
import { ErrorState } from '@/components/ui/Skeleton'
import { useCan } from '@/features/auth/hooks/useCan'
import { formatFileSize } from '@/features/portal/portalExtras'
import { useContactDocuments, useDeleteDocument, useUploadDocument } from '../hooks/usePortalAdmin'

// These mirror the backend (portal-documents.validation.ts); the server stays the authority and answers 415 / 413 otherwise.
const ALLOWED = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
} as const
const MAX_BYTES = 10 * 1024 * 1024
const acceptList = Object.keys(ALLOWED).join(',')

const schema = z.object({ name: z.string().trim().min(1, 'Give the document a name').max(150, 'Keep the name under 150 characters') })
type FormValues = z.infer<typeof schema>

// Staff-side: share files with one contact; the customer sees them under "My documents" in the portal.
export function ContactDocumentsPanel({ contactId }: { contactId: string }) {
  const canManage = useCan('portal.manage')
  const docs = useContactDocuments(contactId, canManage)
  const upload = useUploadDocument()
  const remove = useDeleteDocument()
  const fileInput = useRef<HTMLInputElement>(null)
  const fileIds = useFieldIds()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '' } })

  if (!canManage) return null

  const pickedFileProblem = (file: File | undefined) => {
    if (!file) return 'Choose a file to upload.'
    if (!(file.type in ALLOWED)) return `That file type is not supported. Use ${Object.values(ALLOWED).join(', ')}.`
    if (file.size === 0) return 'That file is empty.'
    if (file.size > MAX_BYTES) return 'That file is too large. The limit is 10 MB.'
    return ''
  }
  const fileError = errors.root?.message

  const onSubmit = ({ name }: FormValues) => {
    const file = fileInput.current?.files?.[0]
    const problem = pickedFileProblem(file)
    if (problem || !file) return setError('root', { message: problem })
    upload.mutate(
      { contactId, name, file },
      { onSuccess: () => { toast.success('Document shared with the customer'); reset(); if (fileInput.current) fileInput.current.value = '' } },
    )
  }

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirmDialog(`Delete "${name}"? The customer will no longer be able to download it.`))) return
    remove.mutate(id, { onSuccess: () => toast.success('Document deleted'), onError: (e) => toast.error(e.message) })
  }

  return (
    <section className="card mt-6 max-w-xl space-y-4 p-6" aria-labelledby="contact-docs">
      <div>
        <h2 id="contact-docs" className="text-base font-semibold text-heading">Shared documents</h2>
        <p className="text-sm text-muted">Files here appear in this customer&apos;s portal. PDF, images, text, CSV, Word or Excel, up to 10 MB.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <Field label="Document name" required error={errors.name?.message} {...register('name')} />
        <div className="space-y-1.5">
          <FieldLabel id={fileIds.id} label="File" required />
          <input
            ref={fileInput}
            id={fileIds.id}
            type="file"
            accept={acceptList}
            aria-required
            aria-invalid={fileError ? true : undefined}
            aria-describedby={describedBy(fileIds, undefined, fileError)}
            className="block w-full text-sm text-body file:mr-3 file:rounded-xl file:border file:border-border file:bg-surface file:px-4 file:py-2 file:text-sm file:font-medium file:text-heading hover:file:bg-primary-soft"
          />
          <FieldMessages {...fileIds} error={fileError} />
        </div>
        {upload.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{upload.error.message}</p>}
        <Button type="submit" loading={upload.isPending}>{upload.isPending ? 'Uploading…' : 'Upload document'}</Button>
      </form>

      {docs.isPending ? (
        <p className="text-sm text-muted">Loading documents…</p>
      ) : docs.isError ? (
        <ErrorState message={docs.error.message} onRetry={() => docs.refetch()} />
      ) : docs.data.data.length === 0 ? (
        <p className="text-sm text-muted">Nothing shared yet.</p>
      ) : (
        <ul className="divide-y divide-border/70" aria-label="Shared documents">
          {docs.data.data.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium text-heading">{doc.name}</span>
                <span className="block truncate text-xs text-muted">{doc.fileName} · {formatFileSize(doc.sizeBytes)} · {format(parseISO(doc.createdAt), 'd MMM yyyy')}</span>
              </span>
              <button type="button" className="link-danger shrink-0" disabled={remove.isPending} onClick={() => handleDelete(doc.id, doc.name)} aria-label={`Delete ${doc.name}`}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
