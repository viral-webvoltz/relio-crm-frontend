import { QueryCache, QueryClient } from '@tanstack/react-query'

const meKeys = [['auth', 'me'], ['portal', 'me']] as const

const isMeKey = (key: readonly unknown[]) => meKeys.some(([a, b]) => key[0] === a && key[1] === b)

// A 401 from any data query means the session expired: refetch "me" so the route guards redirect to login
// instead of leaving a page full of errors. The "me" queries themselves are skipped to avoid a loop.
export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if ((error as { status?: number }).status !== 401 || isMeKey(query.queryKey)) return
      for (const key of meKeys) void queryClient.invalidateQueries({ queryKey: key })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Reads retry twice with backoff, but never on a 4xx (it would fail the same way). Mutations are never retried automatically.
      retry: (failures, error) => {
        const status = (error as { status?: number }).status
        return failures < 2 && !(status && status >= 400 && status < 500)
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
  },
})
