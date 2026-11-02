import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { DatePicker } from './DatePicker'
import { describedBy, FieldLabel, FieldMessages, useFieldIds } from './FieldParts'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }

const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField({ label, error, hint, type, required, ...props }, ref) {
  const ids = useFieldIds()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="space-y-1.5">
      <FieldLabel id={ids.id} label={label} required={required} />
      <div className="relative">
        <input
          id={ids.id}
          ref={ref}
          type={isPassword && revealed ? 'text' : type}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, hint, error)}
          className={`input-base aria-invalid:border-destructive disabled:bg-background disabled:text-muted ${isPassword ? 'pr-10' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            onClick={() => setRevealed((r) => !r)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-heading"
          >
            {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>
      <FieldMessages {...ids} hint={hint} error={error} />
    </div>
  )
})

const setNativeValue = (el: HTMLInputElement, value: string) =>
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value) // bypasses React's value tracker so the event below is seen

// type="date" renders the custom calendar. A visually hidden real input stays underneath, so react-hook-form's
// register() keeps working unchanged: it reads/writes that input and picking a day fires its input event.
const DateField = forwardRef<HTMLInputElement, FieldProps>(function DateField({ label, error, hint, required, disabled, min, max, type: _type, className: _className, ...props }, ref) {
  const ids = useFieldIds()
  const native = useRef<HTMLInputElement | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const [value, setValue] = useState('')

  // react-hook-form sets the input's value directly (defaults, reset); mirror it into the visible control.
  useLayoutEffect(() => {
    const current = native.current?.value ?? ''
    if (current !== value) setValue(current)
  })

  const pick = (next: string) => {
    const el = native.current
    if (!el) return
    setNativeValue(el, next)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    setValue(next)
  }

  return (
    <div className="space-y-1.5">
      <FieldLabel id={ids.id} label={label} required={required} />
      <input
        {...props}
        ref={(el) => {
          native.current = el
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        type="text"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onFocus={() => trigger.current?.focus()} // react-hook-form focuses the field on a validation error
      />
      <DatePicker
        id={ids.id}
        value={value}
        onChange={pick}
        min={typeof min === 'string' ? min : undefined}
        max={typeof max === 'string' ? max : undefined}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        triggerRef={trigger}
      />
      <FieldMessages {...ids} hint={hint} error={error} />
    </div>
  )
})

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(props, ref) {
  return props.type === 'date' ? <DateField {...props} ref={ref} /> : <TextField {...props} ref={ref} />
})
