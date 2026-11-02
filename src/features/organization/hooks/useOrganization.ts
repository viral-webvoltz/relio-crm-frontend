import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { currentUserKey } from '@/features/auth/hooks/useAuth'
import type { ApiError } from '@/lib/httpClient'
import { getOrganization, updateOrganization, type Organization } from '../api'

const organizationKey = ['organization'] as const

export const useOrganization = () => useQuery({ queryKey: organizationKey, queryFn: ({ signal }) => getOrganization(signal) })

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  return useMutation<Organization, ApiError, { name: string; timezone: string }>({
    mutationFn: updateOrganization,
    // The name is shown in the sidebar and on the account page.
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: organizationKey }), queryClient.invalidateQueries({ queryKey: currentUserKey })]),
  })
}
