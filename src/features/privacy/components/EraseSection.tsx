import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { summarise } from '../eraseLabels'
import { useEraseSubject } from '../hooks/usePrivacy'
import { emptySubject, subjectSchema, toSubject, type SubjectValues } from '../schemas/privacySchema'
import type { EraseResult, Subject } from '../types'
import { EraseConfirmDialog, type EraseRequest } from './EraseConfirmDialog'
import { SubjectFields } from './SubjectFields'

// Two steps, because erasing cannot be undone: first "what would go?" (nothing changes), then type to confirm.
// Success is only announced after the server answers.
export function EraseSection() {
  const erase = useEraseSubject()
  const form = useForm<SubjectValues>({ resolver: zodResolver(subjectSchema), defaultValues: emptySubject })
  const [pending, setPending] = useState<{ subject: Subject; request: EraseRequest; confirm: string } | null>(null)
  const [result, setResult] = useState<EraseResult | null>(null)

  const check = (values: SubjectValues) => {
    setResult(null)
    const subject = toSubject(values)
    erase.mutate(
      { ...subject, dryRun: true },
      {
        onSuccess: (preview) =>
          setPending({
            subject,
            request: {
              subjectLabel: values.email ? values.email.trim() : 'the chosen contact',
              // An email is typed back as itself; a chosen contact has no address to type, so the word ERASE is used instead.
              phrase: values.email ? values.email.trim() : 'ERASE',
              counts: preview.counts,
            },
            // What the server wants repeated back: the email, or the contact's id.
            confirm: values.email ? values.email.trim() : values.contactId,
          }),
      },
    )
  }

  const close = () => {
    setPending(null)
    erase.reset()
  }

  const confirm = () => {
    if (!pending) return
    erase.mutate(
      { ...pending.subject, dryRun: false, confirm: pending.confirm },
      {
        onSuccess: (done) => {
          setPending(null)
          setResult(done)
          form.reset(emptySubject)
          toast.success('The data was erased')
        },
      },
    )
  }

  const groups = result ? summarise(result.counts) : []

  return (
    <section className="card space-y-4 border-destructive/30 p-6" aria-labelledby="privacy-erase">
      <div>
        <h2 id="privacy-erase" className="flex items-center gap-2 text-base font-semibold text-heading"><ShieldAlert className="size-4 text-destructive" aria-hidden /> Erase a person's data</h2>
        <p className="mt-1 text-sm text-muted">For when someone asks to be forgotten. You will see exactly what would be removed first, and nothing changes until you confirm.</p>
      </div>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-body">
        <li><strong className="text-heading">Deleted:</strong> their contact and lead records, notes, tasks, files, portal login and email history.</li>
        <li><strong className="text-heading">Kept, with the name taken off:</strong> orders, invoices, quotes, subscriptions and support tickets, because your accounts need them.</li>
        <li>Subscriptions for them are stopped so nobody is billed.</li>
      </ul>
      <form onSubmit={form.handleSubmit(check)} noValidate className="space-y-4">
        <SubjectFields form={form} />
        {!pending && erase.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{erase.error.message}</p>}
        <Button type="submit" variant="ghost" loading={erase.isPending && !pending}>{erase.isPending && !pending ? 'Checking…' : 'Check what would be erased'}</Button>
      </form>

      {result && (
        <div role="status" className="rounded-xl bg-success/10 p-4 text-sm text-heading">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4 text-success" aria-hidden /> The data was erased.</p>
          {groups.map((g) => (
            <div key={g.group} className="mt-2">
              <p className="font-medium">{g.title}</p>
              <ul className="list-disc pl-5 text-body">{g.rows.map((r) => <li key={r.label}>{r.label}: {r.count}</li>)}</ul>
            </div>
          ))}
        </div>
      )}

      <EraseConfirmDialog request={pending?.request ?? null} pending={erase.isPending} error={pending ? erase.error?.message : undefined} onCancel={close} onConfirm={confirm} />
    </section>
  )
}
