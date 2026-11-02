import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/recordEmailsApi'
import type { EmailFormValues } from '../schemas/emailSchema'
import type { EmailEntity } from '../types'

const emailsKey = (entity: EmailEntity, id: string) => ['record-emails', entity, id] as const

const REFRESH_MS = 15_000

// Polled gently so a reply that arrives while the page is open shows up without a reload.
export const useRecordEmails = (entity: EmailEntity, id: string, enabled: boolean) =>
  useQuery({
    queryKey: emailsKey(entity, id),
    queryFn: ({ signal }) => api.getRecordEmails(entity, id, signal),
    enabled,
    refetchInterval: REFRESH_MS,
  })

export function useSendRecordEmail(entity: EmailEntity, id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { values: EmailFormValues; key: string }>({
    mutationFn: ({ values, key }) => api.sendRecordEmail(entity, id, values, key),
    // A sent email also lands in the activity timeline and can move a lead from "new" to "contacted".
    onSuccess: () => Promise.all([emailsKey(entity, id), ['activities'], [entity === 'lead' ? 'leads' : 'contacts']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}
