// What an erase did (or, in a check, would do), in plain words. Keys are the server's `counts` names.
type Group = 'removed' | 'cleared' | 'anonymised' | 'cancelled'

const labels: Record<string, { group: Group; label: string }> = {
  contactsDeleted: { group: 'removed', label: 'Contact records' },
  leadsDeleted: { group: 'removed', label: 'Lead records' },
  activitiesDeleted: { group: 'removed', label: 'Notes and calls' },
  tasksDeleted: { group: 'removed', label: 'Tasks' },
  attachedDocumentsDeleted: { group: 'removed', label: 'Attached documents' },
  portalAccounts: { group: 'removed', label: 'Customer portal logins' },
  portalDocuments: { group: 'removed', label: 'Customer portal documents' },
  portalAppointments: { group: 'removed', label: 'Customer portal appointments' },
  campaignRecordsDeleted: { group: 'removed', label: 'Email campaign records' },
  emailLogsDeleted: { group: 'removed', label: 'Sent-email log entries' },
  webhookPayloadsDeleted: { group: 'removed', label: 'Copies sent to other systems' },
  workflowEventsDeleted: { group: 'removed', label: 'Queued automation events' },
  ticketMessagesScrubbed: { group: 'cleared', label: 'Their messages in support tickets (text removed, replies kept)' },
  auditEntriesScrubbed: { group: 'cleared', label: 'Activity log entries (personal details removed)' },
  ticketsAnonymised: { group: 'anonymised', label: 'Support tickets' },
  ordersAnonymised: { group: 'anonymised', label: 'Orders' },
  invoicesAnonymised: { group: 'anonymised', label: 'Invoices' },
  quotesAnonymised: { group: 'anonymised', label: 'Quotes (their link stops working)' },
  subscriptionsAnonymised: { group: 'anonymised', label: 'Subscriptions' },
  subscriptionsCancelled: { group: 'cancelled', label: 'Subscriptions stopped so nobody is billed' },
}

export const groupTitles: Record<Group, string> = {
  removed: 'Deleted for good',
  cleared: 'Personal text removed',
  anonymised: 'Kept for your accounts, with the name taken off',
  cancelled: 'Stopped',
}

const humanize = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

/** Counts grouped for display. Zero rows are left out; names the screen does not know yet still show, under "removed". */
export function summarise(counts: Record<string, number>) {
  const groups = new Map<Group, { label: string; count: number }[]>()
  for (const [key, count] of Object.entries(counts)) {
    if (!count) continue
    const known = labels[key]
    const group = known?.group ?? 'removed'
    groups.set(group, [...(groups.get(group) ?? []), { label: known?.label ?? humanize(key), count }])
  }
  const order: Group[] = ['removed', 'cleared', 'anonymised', 'cancelled']
  return order.flatMap((g) => (groups.has(g) ? [{ group: g, title: groupTitles[g], rows: groups.get(g)! }] : []))
}
