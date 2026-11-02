import { httpClient } from '@/lib/httpClient'
import type { EmailTemplate, TemplateDraft, TemplateKey, TemplatePreview } from '../types'

export async function getTemplates(signal?: AbortSignal) {
  const { data } = await httpClient.get<{ data: EmailTemplate[] }>('/email-templates', { signal })
  return data.data
}

export const saveTemplate = (key: TemplateKey, draft: TemplateDraft) => httpClient.put(`/email-templates/${key}`, draft)
export const resetTemplate = (key: TemplateKey) => httpClient.delete(`/email-templates/${key}`)

// Renders a draft with sample data on the server; nothing is sent.
export async function previewTemplate(key: TemplateKey, draft: TemplateDraft, signal?: AbortSignal) {
  const { data } = await httpClient.post<{ data: TemplatePreview }>(`/email-templates/${key}/preview`, draft, { signal })
  return data.data
}
