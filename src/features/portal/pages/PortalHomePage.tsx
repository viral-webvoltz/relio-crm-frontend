import { format, parseISO } from 'date-fns'
import { CalendarDays, LifeBuoy, Megaphone, Receipt, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatInvoiceNumber } from '@/features/invoices/types'
import { formatMoney } from '@/lib/money'
import { usePortalInvoices, usePortalMe, usePortalTickets } from '../hooks/usePortal'
import { useAppointments, useNotices } from '../hooks/usePortalExtras'
import { appointmentLabel } from '../portalExtras'
import { portalStatusLabel } from '../tickets'

function Tile({ to, icon: Icon, title, value, hint, children }: { to: string; icon: LucideIcon; title: string; value: ReactNode; hint?: string; children?: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted"><Icon className="size-4" aria-hidden /> {title}</div>
      <div className="mt-2 text-2xl font-semibold text-heading">{value}</div>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      {children}
      <Link to={to} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">View all</Link>
    </section>
  )
}

export function PortalHomePage() {
  const { data: me } = usePortalMe()
  const invoices = usePortalInvoices(1)
  const tickets = usePortalTickets(1)
  const appointments = useAppointments(1)
  const notices = useNotices(1)

  // The first page is enough for a summary: it is the newest records.
  const due = (invoices.data?.data ?? []).filter((i) => i.status !== 'paid' && i.status !== 'void')
  const currency = due[0]?.currency ?? 'USD'
  const owed = due.filter((i) => i.currency === currency).reduce((sum, i) => sum + Math.max(0, i.totalMinor - i.paidMinor), 0)
  const open = (tickets.data?.data ?? []).filter((t) => t.status === 'open' || t.status === 'pending')
  const waiting = open.filter((t) => t.status === 'pending')
  const now = new Date().getTime()
  const next = (appointments.data?.data ?? [])
    .filter((a) => (a.status === 'requested' || a.status === 'confirmed') && parseISO(a.startsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const latest = notices.data?.data?.[0]

  return (
    <>
      <PageHeader title={me?.name ? `Hello, ${me.name.split(' ')[0]}` : 'Welcome'} subtitle="Here is where things stand." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Tile to="/portal/invoices" icon={Receipt} title="Amount due" value={invoices.isPending ? '…' : due.length ? formatMoney(owed, currency) : 'All paid'} hint={due.length ? `${due.length} unpaid invoice${due.length === 1 ? '' : 's'}` : 'Nothing is waiting for payment.'}>
          {due[0] && <Link to={`/portal/invoices/${due[0].id}`} className="mt-2 block text-sm text-body hover:underline">{formatInvoiceNumber(due[0].invoiceNumber)} · due {format(parseISO(due[0].dueDate), 'd MMM yyyy')}</Link>}
        </Tile>
        <Tile to="/portal/support" icon={LifeBuoy} title="Support requests" value={tickets.isPending ? '…' : `${open.length} open`} hint={waiting.length ? `${waiting.length} waiting for your reply` : 'Nothing needs your reply.'}>
          {waiting[0] && <Link to={`/portal/support/${waiting[0].id}`} className="mt-2 block truncate text-sm text-body hover:underline">#{waiting[0].ticketNumber} {waiting[0].subject} · {portalStatusLabel[waiting[0].status]}</Link>}
        </Tile>
        <Tile to="/portal/appointments" icon={CalendarDays} title="Next appointment" value={appointments.isPending ? '…' : next ? format(parseISO(next.startsAt), 'd MMM, HH:mm') : 'None booked'} hint={next ? `${next.subject} · ${appointmentLabel[next.status]}` : 'Request a time that suits you.'} />
        <Tile to="/portal/notices" icon={Megaphone} title="Latest news" value={notices.isPending ? '…' : latest ? latest.title : 'No news'} hint={latest?.publishedAt ? format(parseISO(latest.publishedAt), 'd MMM yyyy') : undefined} />
      </div>
    </>
  )
}
