import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { Field } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { ErrorState, PageSkeleton } from '@/components/ui/Skeleton'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useUnsavedGuard } from '@/lib/useUnsavedGuard'
import { cn } from '@/lib/utils'
import { TemplatePreview } from '../components/TemplatePreview'
import { useEmailTemplates, useResetTemplate, useSaveTemplate, useTemplatePreview } from '../hooks/useEmailTemplates'
import { templateInfo, variableLabel, type EmailTemplate, type TemplateKey } from '../types'

const MAX_SUBJECT = 200
const MAX_BODY = 20_000

const schema = z.object({
  subject: z.string().trim().min(1, 'Enter a subject').max(MAX_SUBJECT, `Keep the subject under ${MAX_SUBJECT} characters`),
  bodyHtml: z.string().min(1, 'Enter the email message').max(MAX_BODY, 'This message is too long'),
  bodyText: z.string().min(1, 'Enter the plain-text message').max(MAX_BODY, 'This message is too long'),
})
type Values = z.infer<typeof schema>
type FieldName = keyof Values

const alertClass = 'rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive'
const fieldId = (name: FieldName) => `tpl-${name}`

function useDebounced<T>(value: T, ms = 600) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

function TemplateEditor({ template, onDirtyChange }: { template: EmailTemplate; onDirtyChange: (dirty: boolean) => void }) {
  const save = useSaveTemplate(template.key)
  const reset = useResetTemplate()
  const last = useRef<FieldName>('bodyHtml')
  const { register, handleSubmit, setError, setValue, getValues, watch, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    // `values` re-syncs the form (and clears "dirty") when the saved or reset template comes back from the server.
    values: { subject: template.subject, bodyHtml: template.bodyHtml, bodyText: template.bodyText },
  })
  useUnsavedGuard(isDirty)
  useServerFieldErrors(save.error, setError)
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange])

  const draft = { subject: watch('subject'), bodyHtml: watch('bodyHtml'), bodyText: watch('bodyText') }
  const debounced = useDebounced(draft)
  const complete = schema.safeParse(debounced).success
  const preview = useTemplatePreview(template.key, debounced, complete)

  // Puts {{name}} where the cursor was in the box you last clicked in (or at the end).
  const insert = (variable: string) => {
    const name = last.current
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)
    const text = getValues(name)
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? start
    const token = `{{${variable}}}`
    setValue(name, text.slice(0, start) + token + text.slice(end), { shouldDirty: true, shouldValidate: true })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const onSubmit = (values: Values) =>
    save.mutate({ ...values, subject: values.subject.trim() }, { onSuccess: () => toast.success(`“${templateInfo[template.key].name}” email saved`) })

  const handleReset = async () => {
    if (!(await confirmDialog('Go back to the built-in wording? Your changes to this email are deleted and cannot be brought back.', { title: 'Reset to default?', confirmLabel: 'Reset to default' }))) return
    reset.mutate(template.key, { onSuccess: () => toast.success('Email reset to the default wording'), onError: (e) => toast.error(e.message) })
  }

  const textarea = (name: 'bodyHtml' | 'bodyText', label: string, hint: string, rows: number) => (
    <div className="space-y-1.5">
      <label htmlFor={fieldId(name)} className="block text-sm font-medium text-heading">{label} <span className="text-destructive" aria-hidden>*</span></label>
      <textarea
        id={fieldId(name)}
        rows={rows}
        spellCheck={false}
        required
        aria-required="true"
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={`${fieldId(name)}-hint`}
        className="input-base h-auto py-2.5 font-mono text-xs"
        {...register(name)}
        onFocus={() => (last.current = name)}
      />
      <p id={`${fieldId(name)}-hint`} className="text-xs text-muted">{hint}</p>
      {errors[name] && <p role="alert" className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  )

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6 p-6">
        <FormSection title="Wording">
          <Field label="Subject" required error={errors.subject?.message} onFocus={() => (last.current = 'subject')} {...register('subject')} />
          {textarea('bodyHtml', 'Email message', 'Basic HTML such as <p> and <strong>. Details from the customer are made safe automatically.', 9)}
          {textarea('bodyText', 'Plain-text message', 'Shown by email apps that do not display formatting.', 7)}
        </FormSection>

        <FormSection title="Details you can insert">
          <p className="text-sm text-muted">Click where you want it in a box above, then pick a detail. It is replaced with the real value when the email is sent.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Insert a detail">
            {template.variables.map((v) => (
              <button key={v} type="button" onClick={() => insert(v)} className="min-h-11 rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-body hover:border-primary hover:text-primary">
                + {variableLabel[v] ?? v}
              </button>
            ))}
          </div>
        </FormSection>

        {save.error && !(save.error.code === 'VALIDATION_ERROR' && save.error.errors?.length) && (
          <p role="alert" className={alertClass}>{save.error.code === 'UNKNOWN_PLACEHOLDERS' ? `${save.error.message}. Use only the details listed above.` : save.error.message}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={save.isPending} disabled={save.isPending || !isDirty}>Save email</Button>
          {template.isOverridden && (
            <Button type="button" variant="ghost" loading={reset.isPending} onClick={handleReset}>Reset to default</Button>
          )}
        </div>
      </form>

      <section aria-label="Preview" className="card space-y-3 p-6 xl:self-start">
        <h2 className="text-base font-semibold text-heading">Preview</h2>
        {preview.isError && <p role="alert" className={alertClass}>The preview could not be built. Check the wording and try again.</p>}
        <TemplatePreview preview={preview.data} loading={preview.isFetching} />
      </section>
    </div>
  )
}

// Settings → Email templates: the wording of the emails the app sends. Each one starts with a built-in default.
export function EmailTemplatesPage() {
  const { data, isPending, isError, error, refetch } = useEmailTemplates()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dirty, setDirty] = useState(false)

  if (isPending) return <PageSkeleton />
  if (isError) return <div className="card"><ErrorState message={error.message} onRetry={() => refetch()} /></div>

  const selected = data.find((t) => t.key === searchParams.get('key')) ?? data[0]!

  const choose = async (key: TemplateKey) => {
    if (key === selected.key) return
    if (dirty && !(await confirmDialog('You have unsaved changes to this email. Switch without saving?', { title: 'Discard changes?', confirmLabel: 'Switch' }))) return
    setSearchParams({ key })
  }

  return (
    <>
      <PageHeader title="Email templates" subtitle="Choose the wording of the emails your customers receive." />
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4" role="group" aria-label="Emails">
        {data.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={t.key === selected.key}
            onClick={() => choose(t.key)}
            className={cn('min-h-11 rounded-2xl border bg-surface p-4 text-left transition', t.key === selected.key ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-primary/50')}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold text-heading">{templateInfo[t.key].name}</span>
              <Badge tone={t.isOverridden ? 'info' : 'neutral'}>{t.isOverridden ? 'customised' : 'default'}</Badge>
            </span>
            <span className="mt-1 block text-sm text-muted">{templateInfo[t.key].when}</span>
          </button>
        ))}
      </div>
      <TemplateEditor key={`${selected.key}:${selected.updatedAt ?? 'default'}`} template={selected} onDirtyChange={setDirty} />
    </>
  )
}
