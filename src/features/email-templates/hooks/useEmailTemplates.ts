import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/emailTemplatesApi'
import type { TemplateDraft, TemplateKey } from '../types'

const key = ['email-templates'] as const

export const useEmailTemplates = () => useQuery({ queryKey: key, queryFn: ({ signal }) => api.getTemplates(signal) })

export function useSaveTemplate(templateKey: TemplateKey) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, TemplateDraft>({ mutationFn: (draft) => api.saveTemplate(templateKey, draft), onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) })
}

export function useResetTemplate() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, TemplateKey>({ mutationFn: api.resetTemplate, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) })
}

/** The server's rendering of the draft with sample data. Only asked for once the draft is complete; the last result stays while typing. */
export const useTemplatePreview = (templateKey: TemplateKey, draft: TemplateDraft, enabled: boolean) =>
  useQuery({
    queryKey: [...key, 'preview', templateKey, draft],
    queryFn: ({ signal }) => api.previewTemplate(templateKey, draft, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  })
