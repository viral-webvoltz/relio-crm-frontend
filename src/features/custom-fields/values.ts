import { useEffect } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '@/lib/httpClient'
import type { CustomFieldDefinition } from './types'

export type CustomFieldValues = Record<string, string | number | boolean>

/** Saved values → what the form inputs hold: numbers as text, blanks as "". Checkboxes stay true/false. */
export function toFormCustomFields(record: Record<string, unknown> | null | undefined): Record<string, string | boolean> {
  return Object.fromEntries(Object.entries(record ?? {}).map(([k, v]) => [k, typeof v === 'boolean' ? v : v == null ? '' : String(v)]))
}

/**
 * Form values → what the API wants, after the checks the server would make anyway (required, real number, allowed option).
 * Problems are put on the matching field and null is returned so the form is not sent.
 * Blank optional fields are sent as "": the server ignores them on create and clears them on update.
 */
export function prepareCustomFields<T extends FieldValues>(
  definitions: CustomFieldDefinition[] | undefined,
  values: Record<string, unknown> | undefined,
  setError: UseFormSetError<T>,
): CustomFieldValues | null {
  const out: CustomFieldValues = {}
  let focused = false
  const fail = (def: CustomFieldDefinition, message: string) => {
    setError(`customFields.${def.key}` as Path<T>, { type: 'custom', message }, { shouldFocus: !focused })
    focused = true
  }
  for (const def of definitions ?? []) {
    const raw = values?.[def.key]
    if (def.type === 'boolean') {
      out[def.key] = raw === true // a yes/no is always an answer, so "required" is always met
      continue
    }
    const text = typeof raw === 'string' ? raw.trim() : ''
    if (text === '') {
      if (def.required) fail(def, `${def.label} is required`)
      else out[def.key] = ''
    } else if (def.type === 'number') {
      if (Number.isFinite(Number(text))) out[def.key] = Number(text)
      else fail(def, 'Enter a number')
    } else if (def.type === 'select' && !(def.options ?? []).includes(text)) fail(def, 'Choose one of the options')
    else out[def.key] = text
  }
  return focused ? null : out
}

type Issue = { field?: string; message?: string }

/** The API reports custom field problems as INVALID_CUSTOM_FIELDS with [{ field, message }]; show each on its input. */
export function useCustomFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  useEffect(() => {
    const api = error as Partial<ApiError> | null
    if (api?.code !== 'INVALID_CUSTOM_FIELDS') return
    let first = true
    for (const issue of (api.errors ?? []) as Issue[]) {
      if (!issue.field || !issue.message) continue
      setError(`customFields.${issue.field}` as Path<T>, { type: 'server', message: issue.message }, { shouldFocus: first })
      first = false
    }
  }, [error, setError])
}
