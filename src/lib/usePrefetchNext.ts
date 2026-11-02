import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { PageMeta } from './apiTypes'

// Warms the cache with the next page once the current one has loaded, so "Next" shows rows instantly.
export function usePrefetchNext<P extends { page: number }, T extends { meta: PageMeta }>(
  listKey: readonly unknown[],
  params: P,
  data: T | undefined,
  fetcher: (params: P, signal?: AbortSignal) => Promise<T>,
) {
  const queryClient = useQueryClient()
  const lastPage = data?.meta.totalPages
  const hasData = Boolean(data)
  useEffect(() => {
    if (!hasData || lastPage === undefined || params.page >= lastPage) return
    const next = { ...params, page: params.page + 1 }
    void queryClient.prefetchQuery({ queryKey: [...listKey, next], queryFn: ({ signal }) => fetcher(next, signal), staleTime: 30_000 })
    // params and fetcher are stable per render of the page they belong to
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData, lastPage, JSON.stringify(params)])
}
