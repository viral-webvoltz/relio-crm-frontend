import { zodResolver } from '@hookform/resolvers/zod'
import { useServerFieldErrors } from '@/lib/useServerFieldErrors'
import { format, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useCan } from '@/features/auth/hooks/useCan'
import { useAdjustStock, useMovements } from '../hooks/useProducts'
import { stockFormSchema, type StockFormValues } from '../schemas/productSchema'
import type { Product } from '../types'
import { StockBadge } from './StockBadge'

// Current stock, a way to adjust it, and the full history of changes.
export function StockPanel({ product }: { product: Product }) {
  const canAdjust = useCan('products.stock')
  const adjust = useAdjustStock(product.id)
  const movements = useMovements(product.id, product.trackInventory)
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<StockFormValues>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: { delta: '', reason: '' },
  })
  useServerFieldErrors(adjust.error, setError)

  const onSubmit = (values: StockFormValues) =>
    adjust.mutate(values, {
      onSuccess: () => {
        toast.success('Stock updated')
        reset()
      },
      onError: (e) => toast.error(e.message),
    })

  return (
    <section className="card mt-6 max-w-xl p-6" aria-labelledby="stock-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="stock-heading" className="text-base font-semibold text-heading">Inventory</h2>
        <StockBadge product={product} />
      </div>

      {!product.trackInventory ? (
        <p className="text-sm text-muted">Inventory is not tracked for this product. Turn on tracking above to manage stock.</p>
      ) : (
        <>
          {canAdjust && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mb-5 grid gap-3 border-b border-border/60 pb-5 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
              <Field label="Change by" inputMode="numeric" placeholder="+10 or -3" error={errors.delta?.message} {...register('delta')} />
              <Field label="Reason (optional)" error={errors.reason?.message} {...register('reason')} />
              <Button type="submit" loading={adjust.isPending}>{adjust.isPending ? 'Saving…' : 'Adjust'}</Button>
            </form>
          )}
          {movements.isPending ? (
            <p className="text-sm text-muted">Loading history…</p>
          ) : movements.isError ? (
            <p role="alert" className="text-sm text-destructive">{movements.error.message}</p>
          ) : movements.data.length === 0 ? (
            <p className="text-sm text-muted">No stock changes recorded yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 font-medium">When</th>
                  <th className="py-2 font-medium">Change</th>
                  <th className="py-2 font-medium">Balance</th>
                  <th className="py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.data.map((m) => (
                  <tr key={m.id} className="border-t border-border/60">
                    <td className="py-2">{format(parseISO(m.createdAt), 'd MMM yyyy, HH:mm')}{m.createdByName && <span className="block text-xs text-muted">{m.createdByName}</span>}</td>
                    <td className={m.delta < 0 ? 'py-2 font-medium text-destructive' : 'py-2 font-medium text-success'}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                    <td className="py-2">{m.balanceAfter}</td>
                    <td className="py-2 text-body">{m.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}
