import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseListParams } from './apiTypes'
import { usePreferences, useSetPreference } from './usePreferences'

type Patch = Record<string, string | number | null | undefined>

// URL is the single source of truth for a list's search / filters / sort / page size / page, so views survive reloads and sharing.
// `update` merges into the existing query (so filters other than the ones you pass are kept) and returns to page 1 unless you pass `page`.
export function useListParams(columns: readonly { sortKey?: string }[] = []) {
  const [searchParams, setSearchParams] = useSearchParams()
  const parsed = parseListParams(searchParams, columns.flatMap((c) => c.sortKey ?? []))
  const { data: prefs } = usePreferences()
  const setPreference = useSetPreference()
  // The saved page size applies unless the URL says otherwise.
  const params = { ...parsed, limit: parsed.limit ?? prefs?.pageSize }

  const update = useCallback(
    (patch: Patch) => {
      if (typeof patch.limit === 'number') setPreference.mutate({ name: 'pageSize', value: patch.limit })
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === undefined || value === '') next.delete(key)
          else next.set(key, String(value))
        }
        if (!('page' in patch) || next.get('page') === '1') next.delete('page')
        return next
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutate is stable
    [setSearchParams, setPreference.mutate],
  )

  return { params, searchParams, update }
}
