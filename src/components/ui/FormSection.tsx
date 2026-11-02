import type { ReactNode } from 'react'

// Groups related fields under a heading; a <fieldset> so screen readers announce the group name.
// Fields flow into two columns once the section itself is wide (container query, so narrow dialogs stay single-column).
// Rows that are already grids, and a lone field (notes, a single select), take the full width.
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="@container border-t border-border/70 pt-5 first:border-0 first:pt-0">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</legend>
      <div className="grid gap-5 @2xl:grid-cols-2 [&>.grid]:col-span-full [&>:only-child]:col-span-full">{children}</div>
    </fieldset>
  )
}
