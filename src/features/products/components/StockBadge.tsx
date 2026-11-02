import { Badge } from '@/components/ui/Badge'
import { getStockLevel, type Product } from '../types'

export function StockBadge({ product }: { product: Pick<Product, 'trackInventory' | 'stockQuantity' | 'reorderLevel'> }) {
  const level = getStockLevel(product)
  if (level === 'untracked') return <span className="text-muted">Not tracked</span>
  const tone = { out: 'danger', low: 'warning', ok: 'success' } as const
  const label = { out: 'out of stock', low: 'low stock', ok: 'in stock' } as const
  return (
    <span className="flex items-center gap-2">
      {product.stockQuantity}
      <Badge tone={tone[level]}>{label[level]}</Badge>
    </span>
  )
}
