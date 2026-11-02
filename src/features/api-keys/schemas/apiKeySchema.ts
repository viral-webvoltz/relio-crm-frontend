import { z } from 'zod'
import type { CreateApiKeyPayload } from '../types'

// "" = never expires. The server accepts 1 to 730 days.
export const expiryOptions = [
  { value: '', label: 'Never (until I revoke it)' },
  { value: '30', label: 'In 30 days' },
  { value: '90', label: 'In 90 days' },
  { value: '180', label: 'In 6 months' },
  { value: '365', label: 'In 1 year' },
  { value: '730', label: 'In 2 years' },
] as const

export const apiKeyFormSchema = z.object({
  name: z.string().trim().min(1, 'Give the key a name so you can recognise it later').max(80, 'Keep the name under 80 characters'),
  expiresIn: z.string(),
  scopes: z.array(z.string()).min(1, 'Choose at least one thing this key may do'),
})
export type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>

export const emptyApiKey: ApiKeyFormValues = { name: '', expiresIn: '90', scopes: [] }

export const toPayload = (values: ApiKeyFormValues): CreateApiKeyPayload => ({
  name: values.name.trim(),
  scopes: values.scopes,
  expiresInDays: values.expiresIn ? Number(values.expiresIn) : null,
})
