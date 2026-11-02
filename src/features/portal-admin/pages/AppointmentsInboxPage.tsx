import { addMinutes, format, parseISO } from 'date-fns'
import { CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { confirmDialog } from '@/components/ui/ConfirmHost'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterChips } from '@/components/ui/FilterChips'
import { Select } from '@/components/ui/Select'
import { useCan } from '@/features/auth/hooks/useCan'
import { appointmentLabel, appointmentTone, type AppointmentStatus } from '@/features/portal/portalExtras'
import { useListParams } from '@/lib/useListParams'
import type { StaffAppointment } from '../api/portalAdminApi'
import { useSetAppointmentStatus, useStaffAppointments } from '../hooks/usePortalAdmin'

const statuses = Object.keys(appointmentLabel) as AppointmentStatus[]

const columns: Column<StaffAppointment>[] = [
  { key: 'customer', header: 'Customer', primary: true, cell: (a) => <span className="font-medium text-heading">{[a.contactFirstName, a.contactLastName].filter(Boolean).join(' ')}</span> },
  { key: 'subject', header: 'About', cell: (a) => <><div>{a.subject}</div>{a.notes && <div className="text-xs text-muted">{a.notes}</div>}</> },
  { key: 'when', header: 'When', cell: (a) => `${format(parseISO(a.startsAt), 'EEE d MMM yyyy, h:mm a')} – ${format(addMinutes(parseISO(a.startsAt), a.durationMinutes), 'h:mm a')}` },
  { key: 'status', header: 'Status', cell: (a) => <Badge tone={appointmentTone[a.status]}>{appointmentLabel[a.status]}</Badge> },
]

// Allowed moves follow the backend's transition table (requested → confirmed/declined, confirmed → completed/cancelled).
const moves: Partial<Record<AppointmentStatus, { to: AppointmentStatus; label: string; confirm?: string; danger?: boolean }[]>> = {
  requested: [{ to: 'confirmed', label: 'Confirm' }, { to: 'declined', label: 'Decline', confirm: 'Decline this request? The customer will see it as declined.', danger: true }],
  confirmed: [{ to: 'completed', label: 'Mark done' }, { to: 'cancelled', label: 'Cancel', confirm: 'Cancel this confirmed appointment?', danger: true }],
}

export function AppointmentsInboxPage() {
  const { params, searchParams, update } = useListParams()
  const status = searchParams.get('status') ?? ''
  const { data, isPending, isFetching, isError, error, refetch } = useStaffAppointments({ ...params, status })
  const setStatus = useSetAppointmentStatus()
  const canManage = useCan('portal.manage')

  const act = async (a: StaffAppointment, move: NonNullable<(typeof moves)[AppointmentStatus]>[number]) => {
    if (move.confirm && !(await confirmDialog(move.confirm, { title: `${move.label}?`, confirmLabel: move.label }))) return
    setStatus.mutate({ id: a.id, status: move.to }, { onSuccess: () => toast.success(`Appointment ${appointmentLabel[move.to].toLowerCase()}`), onError: (e) => toast.error(e.message) })
  }

  if (!canManage) return <p role="alert" className="card p-6 text-sm text-muted">You do not have access to customer appointments.</p>

  return (
    <>
      <PageHeader title="Appointments" subtitle="Requests from customers in the portal." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} className="w-auto">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{appointmentLabel[s]}</option>)}
        </Select>
      </div>
      <FilterChips chips={[status && { label: `Status: ${appointmentLabel[status as AppointmentStatus] ?? status}`, onRemove: () => update({ status: '' }) }]} onClear={() => update({ status: '' })} />
      <DataTable
        caption="Appointment requests"
        columns={columns}
        rows={data?.data}
        rowKey={(a) => a.id}
        loading={isPending}
        refreshing={isFetching}
        error={isError ? error : null}
        onRetry={() => refetch()}
        empty={{ icon: CalendarClock, title: status ? 'No appointments match this status.' : 'No appointment requests yet.', hint: 'Requests made in the customer portal show up here.' }}
        actions={(a) =>
          (moves[a.status] ?? []).map((m) => (
            <button key={m.to} type="button" className={m.danger ? 'link-danger' : 'link-action'} disabled={setStatus.isPending} onClick={() => act(a, m)}>{m.label}</button>
          ))
        }
        meta={data?.meta}
        onPageChange={(page) => update({ page })}
        onPageSizeChange={(limit) => update({ limit })}
      />
    </>
  )
}
