import { useMutation, useQuery } from '@tanstack/react-query'
import { MailX } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { failureOf, getUnsubscribeInfo, isValidToken, unsubscribe, type UnsubscribeFailure } from '../api/unsubscribeApi'

const problem: Record<UnsubscribeFailure, { title: string; text: string }> = {
  invalid: { title: 'This link does not work', text: 'It may be mistyped, out of date, or already used up. If you still get emails you do not want, reply to one of them and ask to be removed.' },
  busy: { title: 'Please try again in a moment', text: 'Lots of people are using this page right now. Wait a minute, then open the link again.' },
  other: { title: 'We could not load this page', text: 'Check your internet connection and try again. Nothing has been changed.' },
}

// The page behind the unsubscribe link in a campaign email. No sign-in, no menus, plain words. Opening the link changes nothing:
// only pressing the button unsubscribes (so mail scanners that open links cannot do it by accident).
export function PublicUnsubscribePage() {
  const { token } = useParams()
  const valid = isValidToken(token)
  const info = useQuery({ queryKey: ['unsubscribe', token], queryFn: ({ signal }) => getUnsubscribeInfo(token!, signal), enabled: valid, retry: false, staleTime: Infinity })
  const done = useMutation({ mutationFn: () => unsubscribe(token!) })

  const failure: UnsubscribeFailure | null = !valid ? 'invalid' : info.isError ? failureOf(info.error) : done.isError ? failureOf(done.error) : null
  const confirmed = done.isSuccess
  const data = done.data ?? info.data
  const already = Boolean(info.data?.unsubscribed) && !confirmed

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <title>Unsubscribe</title>
      <meta name="robots" content="noindex" />
      <div className="card w-full max-w-md space-y-5 p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><MailX className="size-6" aria-hidden /></span>
        {valid && info.isPending ? (
          <p role="status" className="text-sm text-muted">Loading…</p>
        ) : failure && !data ? (
          <div role="alert" className="space-y-2">
            <h1 className="text-xl font-semibold text-heading">{problem[failure].title}</h1>
            <p className="text-sm text-body">{problem[failure].text}</p>
          </div>
        ) : confirmed || already ? (
          <div role="status" className="space-y-2">
            <h1 className="text-xl font-semibold text-heading">{confirmed ? 'You have been unsubscribed' : 'You are already unsubscribed'}</h1>
            <p className="text-sm text-body">
              {data?.email} will no longer get marketing emails from {data?.organizationName}. This can take a few minutes to apply to emails that were already on their way. You may still get messages about things you asked for, such as an order, invoice or support reply.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-heading">Stop emails from {data?.organizationName}?</h1>
            <p className="text-sm text-body">
              Press the button and <strong className="text-heading">{data?.email}</strong> will no longer get marketing emails from {data?.organizationName}.
            </p>
            {failure && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{problem[failure].text}</p>}
            <Button className="w-full" loading={done.isPending} onClick={() => done.mutate()}>{done.isPending ? 'Unsubscribing…' : 'Unsubscribe me'}</Button>
            <p className="text-xs text-muted">Changed your mind? Just close this page. Nothing happens until you press the button.</p>
          </div>
        )}
      </div>
    </main>
  )
}
