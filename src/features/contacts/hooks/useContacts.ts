import { usePrefetchNext } from '@/lib/usePrefetchNext'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ListParams } from '@/lib/apiTypes'
import { useIdempotencyKey } from '@/lib/idempotency'
import type { ApiError } from '@/lib/httpClient'
import * as api from '../api/contactsApi'
import type { ContactFormValues } from '../schemas/contactSchema'

const contactsKey = ['contacts'] as const

export const useContacts = (params: ListParams & { limit?: number }) => {
  const query = useQuery({ queryKey: [...contactsKey, 'list', params], queryFn: ({ signal }) => api.getContacts(params, signal), placeholderData: keepPreviousData })
  usePrefetchNext([...contactsKey, 'list'], params, query.data, api.getContacts)
  return query
}

export const useContact = (id: string | undefined) =>
  useQuery({ queryKey: [...contactsKey, 'detail', id], queryFn: () => api.getContact(id!), enabled: Boolean(id) })

export function useSaveContact(id?: string) {
  const key = useIdempotencyKey()
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, ContactFormValues>({
    mutationFn: (values) => (id ? api.updateContact(id, values) : api.createContact(values, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactsKey }),
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: api.deleteContact,
    // The API also removes the contact's tasks and activity.
    onSuccess: () => Promise.all([contactsKey, ['tasks'], ['activities'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}
