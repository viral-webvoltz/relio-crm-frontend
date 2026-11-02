import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api'

const mailSettingsKey = ['mail-settings'] as const

export const useMailSettings = () => useQuery({ queryKey: mailSettingsKey, queryFn: ({ signal }) => api.getMailSettings(signal) })

function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: mailSettingsKey })
}

export function useSaveMailAccount(id?: string) {
  const refresh = useRefresh()
  return useMutation<unknown, ApiError, api.MailAccountInput>({
    mutationFn: (values) => (id ? api.updateMailAccount(id, values) : api.createMailAccount(values)),
    onSuccess: refresh,
  })
}

export function useActivateMailAccount() {
  const refresh = useRefresh()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.activateMailAccount, onSuccess: refresh })
}

export function useRemoveMailAccount() {
  const refresh = useRefresh()
  return useMutation<unknown, ApiError, string>({ mutationFn: api.removeMailAccount, onSuccess: refresh })
}

export const useTestMailAccount = () => useMutation<string, ApiError, string>({ mutationFn: api.testMailAccount })
