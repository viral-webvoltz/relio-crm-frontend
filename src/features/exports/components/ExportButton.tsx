import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ExportResource } from '../api/exportsApi'
import { useExport } from '../hooks/useExport'

type Props = {
  resource: ExportResource
  /** The list's current search, filters and sort (page and limit are ignored). */
  params?: Record<string, unknown>
}

// Downloads what the list is currently showing (same filters and sort) as CSV.
export function ExportButton({ resource, params = {} }: Props) {
  const { run, busy, progress } = useExport(resource, params)
  return (
    <Button variant="ghost" onClick={run} disabled={busy} aria-busy={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
      {busy ? (progress === null ? 'Exporting…' : `Preparing ${progress}%`) : 'Export'}
    </Button>
  )
}
