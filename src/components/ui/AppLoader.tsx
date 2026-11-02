import { BRAND } from '@/app/config/brand'
import { BrandMark } from './BrandMark'

// Full-screen loader for the moments before the app knows who is signed in: the logo, the product name and a sliding bar.
// The same picture is drawn in index.html, so the page does not change shape when React takes over from the first paint.
export function AppLoader({ label = 'Loading your workspace' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="relative" aria-hidden>
        <span className="absolute inset-0 rounded-xl bg-primary/25 motion-safe:animate-ping" />
        <BrandMark className="relative size-14" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold tracking-tight text-heading">{BRAND.name}</p>
        <p className="mt-1 text-sm text-muted">{label}…</p>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-border" aria-hidden>
        <div className="h-full w-1/3 rounded-full bg-primary motion-safe:animate-[progress_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
  )
}
