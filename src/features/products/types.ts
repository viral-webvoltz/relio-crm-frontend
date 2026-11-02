export type Product = {
  id: string
  name: string
  sku: string | null
  description: string | null
  categoryId: string | null
  categoryName?: string | null
  priceMinor: number
  currency: string
  trackInventory: boolean
  stockQuantity: number
  reorderLevel: number
  isActive: boolean
}

export type ProductCategory = { id: string; name: string }

export type StockMovement = {
  id: string
  delta: number
  balanceAfter: number
  reason: string | null
  createdAt: string
  createdByName: string | null
}

export type StockLevel = 'untracked' | 'out' | 'low' | 'ok'

export function getStockLevel(product: Pick<Product, 'trackInventory' | 'stockQuantity' | 'reorderLevel'>): StockLevel {
  if (!product.trackInventory) return 'untracked'
  if (product.stockQuantity <= 0) return 'out'
  if (product.reorderLevel > 0 && product.stockQuantity <= product.reorderLevel) return 'low'
  return 'ok'
}
