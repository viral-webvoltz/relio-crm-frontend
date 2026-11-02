import { httpClient } from '@/lib/httpClient'
import { idempotent } from '@/lib/idempotency'
import type { EmailFormValues } from '../schemas/emailSchema'
import { emailPaths, type EmailEntity, type RecordEmail } from '../types'

export async function getRecordEmails(entity: EmailEntity, id: string, signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: RecordEmail[] }>(`/${emailPaths[entity]}/${id}/emails`, { signal })
  return data.data
}

export const sendRecordEmail = (entity: EmailEntity, id: string, values: EmailFormValues, idempotencyKey: string) =>
  httpClient.post(`/${emailPaths[entity]}/${id}/email`, values, idempotent(idempotencyKey))
