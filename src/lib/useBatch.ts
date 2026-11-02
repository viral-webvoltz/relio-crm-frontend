import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { showFailures } from '@/components/ui/ResultsHost'
import { postBatch, restoreRecord, type BatchRequest, type BatchResource, type RestorableResource } from './batch'

// A change to one record can ripple into other lists and the dashboard, so refresh the lot.
const refresh = ['leads', 'contacts', 'companies', 'deals', 'products', 'tasks', 'activities', 'dashboard']

export function useRefreshAll() {
  const queryClient = useQueryClient()
  return () => Promise.all(refresh.map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
}

// Real batch endpoint: per-record permission and result, never atomic. A busy guard stops a double-click running it twice.
export function useBatch(resource: BatchResource, noun: readonly [one: string, many: string], labelOf: (id: string) => string, deleteWarning = '') {
  const refreshAll = useRefreshAll()
  const [busy, setBusy] = useState(false)

  const run = async (ids: string[], request: BatchRequest, done = 'updated') => {
    if (busy || ids.length === 0) return
    const label = `${ids.length} ${ids.length === 1 ? noun[0] : noun[1]}`
    const isDelete = request.action === 'delete'
    if (isDelete && !(await confirmDialog(`Move ${label} to the trash? You can restore them afterwards. ${deleteWarning}`.trim(), { title: `Delete ${label}?`, confirmLabel: 'Move to trash' }))) return

    setBusy(true)
    try {
      const result = await postBatch(resource, ids, request)
      await refreshAll()
      const ok = result.succeeded.length
      const failed = result.failed.length
      const viewWhy = failed ? { label: 'View why', onClick: () => showFailures({ title: `${failed} could not be ${isDelete ? 'deleted' : 'updated'}`, failures: result.failed.map((f) => ({ label: labelOf(f.id), code: f.code, message: f.message })) }) } : undefined

      if (ok === 0) toast.error(`Could not ${isDelete ? 'delete' : 'update'} ${label}.`, { action: viewWhy })
      else if (isDelete) {
        const text = failed ? `${ok} moved to trash, ${failed} failed` : `${label} moved to trash`
        toast(text, { action: { label: 'Undo', onClick: () => undo(result.succeeded) }, description: failed ? 'Some could not be deleted.' : undefined, cancel: viewWhy })
      } else if (failed) toast.warning(`${ok} ${done}, ${failed} failed`, { action: viewWhy })
      else toast.success(`${label} ${done}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const undo = async (ids: string[]) => {
    const results = await Promise.allSettled(ids.map((id) => restoreRecord(resource, id)))
    await refreshAll()
    const bad = results.filter((r) => r.status === 'rejected').length
    if (bad === 0) toast.success(`${ids.length} restored`)
    else toast.warning(`${ids.length - bad} restored, ${bad} could not be restored (a unique value may have been reused).`)
  }

  return { run, busy }
}

// "Moved to trash — Undo" for a single delete. Deleting is a soft delete, so Undo calls the restore endpoint.
export function useUndoToast() {
  const refreshAll = useRefreshAll()
  return (resource: RestorableResource, id: string, noun: string) =>
    toast(`${noun} moved to trash`, {
      action: {
        label: 'Undo',
        onClick: () =>
          restoreRecord(resource, id).then(
            () => refreshAll().then(() => toast.success(`${noun} restored`)),
            (e: Error) => toast.error(e.message),
          ),
      },
    })
}
