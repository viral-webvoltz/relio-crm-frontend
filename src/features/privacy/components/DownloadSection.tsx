import { zodResolver } from '@hookform/resolvers/zod'
import { Download } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { useDownloadPersonalData } from '../hooks/usePrivacy'
import { emptySubject, subjectSchema, toSubject, type SubjectValues } from '../schemas/privacySchema'
import { SubjectFields } from './SubjectFields'

export function DownloadSection() {
  const download = useDownloadPersonalData()
  const form = useForm<SubjectValues>({ resolver: zodResolver(subjectSchema), defaultValues: emptySubject })

  const onSubmit = (values: SubjectValues) =>
    download.mutate(toSubject(values), { onSuccess: () => toast.success('The data file was downloaded') })

  return (
    <section className="card space-y-4 p-6" aria-labelledby="privacy-download">
      <div>
        <h2 id="privacy-download" className="flex items-center gap-2 text-base font-semibold text-heading"><Download className="size-4 text-primary" aria-hidden /> Download a person's data</h2>
        <p className="mt-1 text-sm text-muted">When someone asks what you hold about them, this gives you a file with their contact and lead records, notes, tasks, orders, invoices, support messages, portal details and emails sent to them.</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <SubjectFields form={form} />
        {download.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{download.error.message}</p>}
        <p className="text-xs text-muted">The file contains personal information. Send it only to the person it is about, and delete your copy afterwards.</p>
        <Button type="submit" loading={download.isPending}>{download.isPending ? 'Preparing the file…' : 'Download data file'}</Button>
      </form>
    </section>
  )
}
