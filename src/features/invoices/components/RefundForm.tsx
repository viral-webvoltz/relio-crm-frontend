import { zodResolver } from '@hookform/resolvers/zod'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { toMajor } from '@/lib/money'
import { useRefundPayment } from '../hooks/useInvoices'
import { refundFormSchema, type RefundFormValues } from '../schemas/invoiceSchema'

type RefundFormProps = { paymentId: string; refundableMinor: number; onDone: () => void }

export function RefundForm({ paymentId, refundableMinor, onDone }: RefundFormProps) {
  const refund = useRefundPayment()
  const { register, handleSubmit, setError, formState: { errors } } = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: { amount: toMajor(refundableMinor), reason: '' },
  })
  useServerFieldErrors(refund.error, setError)

  const onSubmit = (values: RefundFormValues) =>
    refund.mutate({ paymentId, values }, {
      onSuccess: () => {
        toast.success('Refund recorded')
        onDone()
      },
      onError: (e) => toast.error(e.message),
    })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-2 grid gap-3 rounded-xl bg-background/70 p-3 sm:grid-cols-[8rem_1fr_auto_auto] sm:items-end">
      <Field label="Refund amount" inputMode="decimal" error={errors.amount?.message} {...register('amount')} />
      <Field label="Reason (optional)" error={errors.reason?.message} {...register('reason')} />
      <Button type="submit" loading={refund.isPending}>{refund.isPending ? 'Refunding…' : 'Refund'}</Button>
      <Button variant="ghost" onClick={onDone}>Cancel</Button>
    </form>
  )
}
