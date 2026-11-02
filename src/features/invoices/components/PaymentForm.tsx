import { zodResolver } from '@hookform/resolvers/zod'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SelectField } from '@/components/ui/SelectField'
import { toMajor } from '@/lib/money'
import { useRecordPayment } from '../hooks/useInvoices'
import { paymentFormSchema, type PaymentFormValues } from '../schemas/invoiceSchema'
import { methodLabel, paymentMethods } from '../types'

export function PaymentForm({ invoiceId, outstandingMinor }: { invoiceId: string; outstandingMinor: number }) {
  // One key per submission: a double click or a retry after a network error is recognised by the server
  // and cannot record the payment twice. A new key is issued only after the payment succeeds.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const record = useRecordPayment(invoiceId)
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    values: { amount: toMajor(outstandingMinor), method: 'bank_transfer', reference: '' },
  })
  useServerFieldErrors(record.error, setError)

  const onSubmit = (values: PaymentFormValues) =>
    record.mutate({ values, idempotencyKey }, {
      onSuccess: () => {
        toast.success('Payment recorded')
        setIdempotencyKey(crypto.randomUUID())
        reset()
      },
      onError: (e) => toast.error(e.message),
    })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mb-5 grid gap-3 border-b border-border/60 pb-5 sm:grid-cols-[8rem_10rem_1fr_auto] sm:items-end">
      <Field label="Amount" inputMode="decimal" error={errors.amount?.message} {...register('amount')} />
      <SelectField label="Method" {...register('method')}>
        {paymentMethods.map((m) => <option key={m} value={m}>{methodLabel[m]}</option>)}
      </SelectField>
      <Field label="Reference (optional)" placeholder="Receipt or transaction ID" error={errors.reference?.message} {...register('reference')} />
      <Button type="submit" loading={record.isPending}>{record.isPending ? 'Recording…' : 'Record payment'}</Button>
    </form>
  )
}
