import { BarChart3, CircleDollarSign, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { BRAND } from '@/app/config/brand'
import { BrandMark } from '@/components/ui/BrandMark'

const perks = [
  { icon: Target, text: 'Capture and qualify every lead' },
  { icon: CircleDollarSign, text: 'Drag deals through your pipeline' },
  { icon: BarChart3, text: 'See revenue and conversion at a glance' },
]

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-indigo-300/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3 text-xl font-semibold">
          <BrandMark className="size-10 shadow-lg shadow-black/20" />
          {BRAND.name}
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Close more deals, with less busywork.</h2>
          <ul className="mt-8 space-y-4">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/85">{BRAND.tagline} Your whole sales team, one workspace.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-2.5 text-xl font-semibold text-heading lg:hidden">
          <BrandMark className="size-10" />
          {BRAND.name}
        </div>
        <div className="card w-full p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-heading">{title}</h1>
          <p className="mb-6 mt-1.5 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
        </div>
      </section>
    </main>
  )
}
