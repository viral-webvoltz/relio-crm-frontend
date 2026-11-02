import type { ApiError } from '@/lib/httpClient'

// Plain-language versions of the quote-specific error codes; anything else keeps the server's own (already readable) message.
const messages: Record<string, string> = {
  QUOTE_LOCKED: 'This quote can no longer be changed, because the customer has already answered it or it was converted.',
  QUOTE_EXPIRED: 'This quote has expired. Extend its valid-until date first.',
  NOT_ACCEPTED: 'Only an accepted quote can be turned into an order.',
  ALREADY_CONVERTED: 'This quote was already turned into an order.',
  TOTAL_MISMATCH: 'The order total would differ from the quote the customer accepted, so nothing was created. Check the product prices and try again.',
  RECIPIENT_NOT_ALLOWED: 'You can only send a quote to its contact or to a colleague. Leave the box empty to use the contact’s email.',
  PRODUCT_INACTIVE: 'One of the products is no longer available. Remove it or choose another.',
  MIXED_CURRENCY: 'All products in a quote must use the same currency.',
  DISCOUNT_TOO_LARGE: 'The discount is larger than the quote subtotal.',
}

export const quoteErrorText = (error: Pick<ApiError, 'code' | 'message'>) => messages[error.code] ?? error.message
