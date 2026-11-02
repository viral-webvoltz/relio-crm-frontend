import type { ApiError } from '@/lib/httpClient'

// Plain-language versions of the subscription error codes; anything else keeps the server's own (already readable) message.
const messages: Record<string, string> = {
  START_IN_PAST: 'The first invoice date can’t be in the past. Choose today or a later date.',
  EMPTY_SCHEDULE: 'With these dates nothing would ever be billed. Check the first invoice date and when it ends.',
  DISCOUNT_TOO_LARGE: 'The discount is larger than the total of the items.',
  SUBSCRIPTION_LOCKED: 'This subscription can’t be changed in its current state. Refresh the page to see where it stands.',
  SUBSCRIPTION_HAS_INVOICES: 'This subscription has already created invoices, so it can’t be deleted. Cancel it instead to keep its history.',
  SUBSCRIPTION_NOT_ACTIVE: 'Only an active subscription can create an invoice now. Resume it first.',
  INVALID_PRODUCT: 'One of the products no longer exists. Remove it or choose another.',
  PRODUCT_INACTIVE: 'One of the products is no longer available. Remove it or choose another.',
  MIXED_CURRENCY: 'All products in a subscription must use the same currency.',
  INVALID_CONTACT: 'That contact could not be found. Choose another.',
  INVALID_COMPANY: 'That company could not be found. Choose another.',
}

export const subscriptionErrorText = (error: Pick<ApiError, 'code' | 'message'>) => messages[error.code] ?? error.message
