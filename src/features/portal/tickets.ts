// Customer-facing ticket shapes: the portal API returns far less than the staff API (no priority, SLA, assignee or internal notes).
export type PortalTicket = { id: string; ticketNumber: number; subject: string; status: 'open' | 'pending' | 'resolved' | 'closed'; createdAt: string; updatedAt: string }

export type PortalTicketMessage = { id: string; authorType: 'staff' | 'customer'; body: string; createdAt: string }

export type PortalTicketDetail = PortalTicket & { messages: PortalTicketMessage[] }

// Customers see plain wording for each state.
export const portalStatusLabel: Record<PortalTicket['status'], string> = {
  open: 'Being looked at',
  pending: 'Waiting for your reply',
  resolved: 'Resolved',
  closed: 'Closed',
}
