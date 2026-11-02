import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { campaignMessage } from '../errors'
import { useSendTest } from '../hooks/useCampaigns'
import { FormDialog } from './FormDialog'

const schema = z.object({ to: z.string().trim().email('Enter a valid email address') })

// Sends one copy, filled in with sample details, so the author can check how it looks in a real inbox. Nobody on the audience gets it.
export function TestSendDialog({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false)
  const me = useCurrentUser()
  const send = useSendTest(campaignId)
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema), values: { to: me.data?.email ?? '' } })

  const close = () => {
    setOpen(false)
    send.reset()
  }
  return (
    <>
      <button type="button" className="btn-ghost gap-1.5" onClick={() => { reset(); setOpen(true) }}>
        <Send className="size-4" aria-hidden /> Send a test
      </button>
      <FormDialog open={open} onClose={close} titleId="campaign-test-title">
        <form
          noValidate
          className="space-y-4 p-6"
          onSubmit={handleSubmit(({ to }) =>
            send.mutate(to, {
              onSuccess: () => {
                toast.success('Test email queued', { description: `It should reach ${to} in a minute or two.` })
                close()
              },
            }),
          )}
        >
          <h2 id="campaign-test-title" className="text-lg font-semibold text-heading">Send a test email</h2>
          <p className="text-sm text-body">You get one copy with sample details filled in, marked “[Test]”. Nobody on the audience receives it. It can only go to someone with an account in your organisation.</p>
          <Field label="Send it to" type="email" required autoComplete="email" error={errors.to?.message} {...register('to')} />
          {send.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{campaignMessage(send.error)}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" loading={send.isPending}>{send.isPending ? 'Sending…' : 'Send test'}</Button>
          </div>
        </form>
      </FormDialog>
    </>
  )
}
