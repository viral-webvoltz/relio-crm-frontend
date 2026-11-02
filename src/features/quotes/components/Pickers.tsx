import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Combobox } from '@/components/ui/Combobox'
import { formatMoney } from '@/lib/money'
import { getDealChoice, getProductChoice, searchDeals, searchProducts, type ProductChoice } from '../api/quotesApi'

// Products seen in a search are remembered, so picking one can fill in its price without another request.
const seen = new Map<string, ProductChoice>()
export const knownProduct = (id: string) => seen.get(id)
const remember = (p: ProductChoice) => {
  seen.set(p.id, p)
  return p
}
const productLabel = (p: ProductChoice) => `${p.name}${p.sku ? ` (${p.sku})` : ''} — ${formatMoney(p.priceMinor, p.currency)}`

type ProductSelectProps = { label: string; value: string; onChange: (id: string, product?: ProductChoice) => void; error?: string; required?: boolean }

export function ProductSelect({ label, value, onChange, error, required }: ProductSelectProps) {
  return (
    <Combobox
      label={label}
      scope="quote-products"
      value={value}
      required={required}
      error={error}
      placeholder="Search products…"
      onChange={(id) => onChange(id, seen.get(id))}
      fetchOptions={async (q, signal) => (await searchProducts(q, signal)).map((p) => ({ id: remember(p).id, label: productLabel(p) }))}
      fetchOne={async (id, signal) => {
        const p = remember(await getProductChoice(id, signal))
        return { id: p.id, label: productLabel(p) }
      }}
    />
  )
}

export function DealSelect<T extends FieldValues>({ control, name }: { control: Control<T>; name: Path<T> }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Combobox
          label="Deal (optional)"
          scope="quote-deals"
          emptyLabel="No deal"
          placeholder="Search deals…"
          value={field.value ?? ''}
          onChange={field.onChange}
          fetchOptions={async (q, signal) => (await searchDeals(q, signal)).map((d) => ({ id: d.id, label: d.title }))}
          fetchOne={async (id, signal) => {
            const d = await getDealChoice(id, signal)
            return { id: d.id, label: d.title }
          }}
        />
      )}
    />
  )
}
