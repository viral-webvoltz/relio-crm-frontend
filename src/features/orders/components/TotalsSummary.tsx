import { formatMoney } from '@/lib/money'

type TotalsSummaryProps = { currency: string; subtotalMinor: number; discountMinor: number; taxMinor: number; totalMinor: number }

export function TotalsSummary({ currency, subtotalMinor, discountMinor, taxMinor, totalMinor }: TotalsSummaryProps) {
  const row = 'flex justify-between py-1 text-sm'
  return (
    <dl className="ml-auto w-full max-w-xs">
      <div className={row}><dt className="text-muted">Subtotal</dt><dd>{formatMoney(subtotalMinor, currency)}</dd></div>
      {discountMinor > 0 && <div className={row}><dt className="text-muted">Discount</dt><dd>−{formatMoney(discountMinor, currency)}</dd></div>}
      <div className={row}><dt className="text-muted">Tax</dt><dd>{formatMoney(taxMinor, currency)}</dd></div>
      <div className="mt-1 flex justify-between border-t border-border/60 pt-2 text-base font-semibold text-heading">
        <dt>Total</dt><dd>{formatMoney(totalMinor, currency)}</dd>
      </div>
    </dl>
  )
}
