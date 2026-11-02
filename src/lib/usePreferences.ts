import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from './httpClient'

export type Preferences = { sidebarCollapsed?: boolean; pageSize?: number } & Record<string, unknown>

const key = ['me', 'preferences'] as const

// Per-user settings stored on the server so they follow the user across devices.
// A failed load just means defaults (and localStorage for the sidebar); it is never shown as an error.
export function usePreferences() {
  return useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => (await httpClient.get<{ data: Preferences }>('/me/preferences', { signal })).data.data,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useSetPreference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, value }: { name: string; value: unknown }) => httpClient.put(`/me/preferences/${name}`, { value }),
    onMutate: ({ name, value }) => queryClient.setQueryData<Preferences>(key, (old) => ({ ...old, [name]: value })),
    // Not worth interrupting the user: the change still applies on this device.
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
