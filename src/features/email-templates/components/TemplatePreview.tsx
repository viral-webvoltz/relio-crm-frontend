import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { TemplatePreview as Preview } from '../types'

// The HTML goes into a sandboxed frame with every permission off (no scripts, forms, popups or same-origin access),
// so even unexpected markup in a template cannot run or reach the app. The plain-text version is shown as text.
const frame = (html: string) => `<!doctype html><meta charset="utf-8"><body style="margin:16px;font:14px/1.5 system-ui,sans-serif;color:#1f2937;background:#fff">${html}`

export function TemplatePreview({ preview, loading }: { preview?: Preview; loading: boolean }) {
  const [tab, setTab] = useState<'html' | 'text'>('html')
  if (!preview) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">{loading ? 'Building preview…' : 'Fill in the subject and both messages to see a preview.'}</p>
  return (
    <div className="space-y-3" aria-busy={loading}>
      <p className="text-sm text-muted">Preview with example details. Nothing is sent.</p>
      <p className="rounded-xl bg-background px-3 py-2 text-sm"><span className="text-muted">Subject: </span><span className="font-medium text-heading">{preview.subject}</span></p>
      <div role="tablist" aria-label="Preview version" className="flex gap-1">
        {([['html', 'Email'], ['text', 'Plain text']] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('min-h-11 rounded-lg px-3 text-sm font-medium', tab === k ? 'bg-primary-soft text-primary' : 'text-muted hover:text-heading')}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'html' ? (
        <iframe title="Email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={frame(preview.html)} className="h-72 w-full rounded-xl border border-border bg-white" />
      ) : (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-surface p-4 text-sm text-body">{preview.text}</pre>
      )}
    </div>
  )
}
