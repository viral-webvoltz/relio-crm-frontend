import { forwardRef, useId, type InputHTMLAttributes } from 'react'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, ...props }, ref) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm capitalize text-body transition has-checked:border-primary/40 has-checked:bg-primary-soft has-checked:text-heading">
      <input id={id} ref={ref} type="checkbox" className="size-4 rounded border-border accent-primary" {...props} />
      {label}
    </label>
  )
})
