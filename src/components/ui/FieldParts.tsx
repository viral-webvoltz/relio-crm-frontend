import { useId, type ReactNode } from 'react'

// Shared pieces so every control (input, select, combobox) labels, hints and reports errors the same way.
export function useFieldIds() {
  const id = useId()
  return { id, hintId: `${id}-hint`, errorId: `${id}-error` }
}

export function describedBy(ids: { hintId: string; errorId: string }, hint?: string, error?: string) {
  return [hint && ids.hintId, error && ids.errorId].filter(Boolean).join(' ') || undefined
}

export function FieldLabel({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={id} className="text-sm font-medium text-heading">
      {label}
      {required && <span aria-hidden className="ml-0.5 text-destructive">*</span>}
    </label>
  )
}

export function FieldMessages({ hintId, errorId, hint, error }: { hintId: string; errorId: string; hint?: ReactNode; error?: string }) {
  return (
    <>
      {hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
      {error && <p id={errorId} className="text-xs text-destructive">{error}</p>}
    </>
  )
}
