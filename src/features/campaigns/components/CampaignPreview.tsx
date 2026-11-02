import { useDeferredValue } from 'react'
import { renderSample } from '../types'

// What the email is allowed to load inside the preview: its own styles and https/inline images, nothing else.
const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'">`

// The author's HTML is shown in an iframe with every sandbox permission off (no scripts, forms, popups or access to this app),
// filled in with a sample reader. It is never put into this page's own DOM.
export function CampaignPreview({ subject, bodyHtml, bodyText }: { subject: string; bodyHtml: string; bodyText: string }) {
  const content = useDeferredValue(renderSample({ subject, bodyHtml, bodyText }))
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">Shown for a sample reader (Alex Example). Links in the preview do nothing.</p>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Subject</p>
        <p className="text-sm font-medium text-heading">{content.subject || '—'}</p>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Email</p>
        <iframe title="Email preview" sandbox="" srcDoc={`${CSP}${content.html}`} className="h-80 w-full rounded-xl border border-border bg-white" />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Plain-text version</p>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-xs text-body">{content.text || '—'}</pre>
      </div>
    </div>
  )
}
