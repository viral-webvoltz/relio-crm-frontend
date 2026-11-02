// Live preview only: this mirrors the server's integer math (basis points, rounded once half-up) so the
// numbers on screen match what the server stores. The server's calculation is the authoritative one.
export type Discount = { type: 'percent'; value: number } | { type: 'fixed'; value: number }

export function previewTotals(lines: { unitPriceMinor: number; quantity: number }[], discount: Discount | null, taxRateBps: number) {
  const subtotalMinor = lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0)
  let discountMinor = 0
  if (discount?.type === 'percent') discountMinor = Math.round((subtotalMinor * discount.value) / 10_000)
  if (discount?.type === 'fixed') discountMinor = discount.value
  const isDiscountTooLarge = discountMinor > subtotalMinor
  const taxable = subtotalMinor - (isDiscountTooLarge ? 0 : discountMinor)
  const taxMinor = Math.round((taxable * taxRateBps) / 10_000)
  return { subtotalMinor, discountMinor, taxMinor, totalMinor: taxable + taxMinor, isDiscountTooLarge }
}
