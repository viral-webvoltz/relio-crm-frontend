import { Copy, Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BRAND } from '@/app/config/brand'
import { Button } from '@/components/ui/Button'
import { saveBlob } from '@/lib/download'

export async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    toast.error('Could not copy. Select the text and copy it by hand.')
  }
}

type Props = { heading: string; codes: string[]; note?: string; onDone: () => void }

// The only time these codes are shown: the server keeps hashes. Done stays disabled until the person says they saved them.
export function RecoveryCodes({ heading, codes, note, onDone }: Props) {
  const [saved, setSaved] = useState(false)
  const download = () =>
    saveBlob(new Blob([`${BRAND.name} recovery codes\nEach code works once. Keep this file somewhere safe.\n\n${codes.join('\n')}\n`], { type: 'text/plain' }), `${BRAND.name.toLowerCase()}-recovery-codes.txt`)

  return (
    <section aria-labelledby="recovery-heading" className="space-y-4">
      <h3 id="recovery-heading" className="text-base font-semibold text-heading">{heading}</h3>
      <p className="text-sm text-body">Use one of these if you lose your phone. Each code works once. <strong className="text-heading">We cannot show them again.</strong></p>
      {note && <p role="status" className="text-sm text-muted">{note}</p>}
      <ul className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-4 font-mono text-sm text-heading sm:grid-cols-5" aria-label="Recovery codes">
        {codes.map((code) => <li key={code}>{code}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => copyText(codes.join('\n'), 'Recovery codes copied')}><Copy className="size-4" aria-hidden /> Copy all</Button>
        <Button variant="ghost" onClick={download}><Download className="size-4" aria-hidden /> Download as a text file</Button>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-body">
        <input type="checkbox" className="size-4 accent-primary" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I have saved these recovery codes somewhere safe
      </label>
      <Button disabled={!saved} onClick={onDone}>Done</Button>
    </section>
  )
}
