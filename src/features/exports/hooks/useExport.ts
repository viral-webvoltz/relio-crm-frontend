import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { saveBlob } from '@/lib/download'
import type { ApiError } from '@/lib/httpClient'
import { createExportJob, downloadExport, getExportJob, quickExport, type ExportResource } from '../api/exportsApi'

const POLL_MS = 1500
const GIVE_UP_MS = 5 * 60 * 1000
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Small exports download straight away; larger ones become a background job that is polled until the file is ready.
export function useExport(resource: ExportResource, params: Record<string, unknown>) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const alive = useRef(true)
  const key = useRef(crypto.randomUUID())
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const runJob = async () => {
    const jobId = await createExportJob(resource, params, key.current)
    toast.info('This is a large export. Preparing your file…')
    const startedAt = Date.now()
    for (;;) {
      await sleep(POLL_MS)
      if (!alive.current) return
      const job = await getExportJob(jobId)
      setProgress(job.progress)
      if (job.status === 'failed') throw new Error(job.error ?? 'The export failed.')
      if (job.status === 'done' && job.downloadUrl) {
        const { blob, fileName } = await downloadExport(job.downloadUrl, `${resource}.csv`)
        saveBlob(blob, fileName)
        toast.success('Your file is ready and has been downloaded.')
        return
      }
      if (Date.now() - startedAt > GIVE_UP_MS) throw new Error('The export is taking too long. Try narrowing the filters.')
    }
  }

  const run = async () => {
    if (busy) return
    setBusy(true)
    setProgress(null)
    try {
      const { blob, fileName } = await quickExport(resource, params)
      saveBlob(blob, fileName)
      toast.success('Export downloaded')
    } catch (error) {
      try {
        // With responseType blob the error body is unreadable, so the 413 is recognised by status.
        if ((error as ApiError).status === 413) await runJob()
        else toast.error((error as ApiError).message ?? 'Could not export.')
      } catch (jobError) {
        toast.error((jobError as Error).message || 'Could not export.')
        key.current = crypto.randomUUID() // a failed attempt should not be replayed
      }
    } finally {
      if (alive.current) {
        setBusy(false)
        setProgress(null)
      }
    }
  }

  return { run, busy, progress }
}
