import { format, parseISO } from 'date-fns'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TicketMessage } from '../types'

// Internal notes are drawn differently and labelled, so a staff member can never mistake one for a customer-visible reply.
export function TicketThread({ messages }: { messages: TicketMessage[] }) {
  return (
    <ol className="space-y-3">
      {messages.map((message) => (
        <li
          key={message.id}
          className={cn(
            'rounded-xl border p-4 text-sm',
            message.isInternal ? 'border-warning/40 bg-warning/10' : message.authorType === 'customer' ? 'border-border bg-surface' : 'border-primary/20 bg-primary-soft/60',
          )}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-medium text-heading">{message.authorName ?? (message.authorType === 'customer' ? 'Customer' : 'Staff')}</span>
            <span>{message.authorType === 'customer' ? 'customer' : 'support team'}</span>
            <span>· {format(parseISO(message.createdAt), 'd MMM yyyy, HH:mm')}</span>
            {message.isInternal && (
              <span className="inline-flex items-center gap-1 font-semibold text-warning">
                <Lock className="size-3" aria-hidden /> Internal note — customers cannot see this
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-body">{message.body}</p>
        </li>
      ))}
    </ol>
  )
}
