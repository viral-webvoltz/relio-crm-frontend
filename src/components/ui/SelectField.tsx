import { forwardRef, useLayoutEffect, useRef, useState, type SelectHTMLAttributes } from 'react'
import { describedBy, FieldLabel, FieldMessages, useFieldIds } from './FieldParts'
import { Select } from './Select'

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: string }

// Looks like the app's custom Select but stays a real <select> underneath (visually hidden), so react-hook-form's
// register() keeps working unchanged: it reads/writes that element, and picking an option fires its change event.
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, required, children, disabled, className: _className, ...props },
  ref,
) {
  const ids = useFieldIds()
  const native = useRef<HTMLSelectElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const [value, setValue] = useState('')

  // react-hook-form sets the element's value directly (defaults, reset); mirror it into the visible control.
  useLayoutEffect(() => {
    const current = native.current?.value ?? ''
    if (current !== value) setValue(current)
  })

  const pick = (next: string) => {
    const el = native.current
    if (!el) return
    el.value = next
    el.dispatchEvent(new Event('change', { bubbles: true }))
    setValue(next)
  }

  return (
    <div className="space-y-1.5">
      <FieldLabel id={ids.id} label={label} required={required} />
      <select
        {...props}
        ref={(el) => {
          native.current = el
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onFocus={() => trigger.current?.focus()} // react-hook-form focuses the field on a validation error
      >
        {children}
      </select>
      <Select
        id={ids.id}
        value={value}
        onChange={(e) => pick(e.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        className="capitalize"
        triggerRef={trigger}
      >
        {children}
      </Select>
      <FieldMessages {...ids} hint={hint} error={error} />
    </div>
  )
})
