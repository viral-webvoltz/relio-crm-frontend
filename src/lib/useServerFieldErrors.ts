import { useEffect } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from './httpClient'

type Issue = { path?: (string | number)[]; message?: string }

// Puts backend validation issues (Zod `issues`) onto the matching form fields and focuses the first one.
// Issues that don't match a field stay visible in the form-level alert.
export function useServerFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  useEffect(() => {
    const api = error as Partial<ApiError> | null
    if (api?.code !== 'VALIDATION_ERROR') return
    let first = true
    for (const issue of (api.errors ?? []) as Issue[]) {
      if (!issue.path?.length || !issue.message) continue
      setError(issue.path.join('.') as Path<T>, { type: 'server', message: issue.message }, { shouldFocus: first })
      first = false
    }
  }, [error, setError])
}
