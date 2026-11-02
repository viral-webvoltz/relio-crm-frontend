import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { subscriptionErrorText } from '../errors'
import { useRunNow } from '../hooks/useSubscriptions'
import type { RunNowResult } from '../types'

type Props = { id: string; name: string; nextRunOn: string | null; onDone: (result: RunNowResult) => void }

// Creates the next invoice now instead of waiting for its date. Billing is the one thing here that can't be undone, so it asks first,
// and one key per confirmation means a double-click or a retry after a dropped connection can't bill twice.
export function RunNowButton({ id, name, nextRunOn, onDone }: Props) {
  const [key, setKey] = useState(() => crypto.randomUUID())
  const run = useRunNow(id, key)

  const click = async () => {
    const ok = await confirmDialog(
      `Create an invoice for “${name}” now${nextRunOn ? `, instead of waiting for ${nextRunOn}` : ''}? An order and an invoice are created straight away, and the schedule moves on to the following date. This can’t be undone.`,
      { title: 'Create the invoice now?', confirmLabel: 'Create invoice', tone: 'primary' },
    )
    if (!ok) return
    run.mutate(undefined, {
      onSuccess: (result) => {
        setKey(crypto.randomUUID()) // a later click is a new request, not a repeat of this one
        toast.success('Invoice created')
        onDone(result)
      },
      onError: (e) => toast.error(subscriptionErrorText(e)),
    })
  }

  return (
    <Button type="button" variant="ghost" loading={run.isPending} onClick={click}>
      {run.isPending ? 'Creating…' : 'Create invoice now'}
    </Button>
  )
}
