import { httpClient } from '@/lib/httpClient'
import type { Paginated } from '@/lib/apiTypes'
import type { ChangePasswordValues, PortalLoginValues } from '../schemas/portalSchema'
import type { PortalTicket, PortalTicketDetail } from '../tickets'
import type { PortalInvoice, PortalInvoiceDetail, PortalMe, PortalOrder, PortalOrderDetail } from '../types'

export async function getPortalMe() {
  const { data } = await httpClient.get<{ data: PortalMe }>('/portal/me')
  return data.data
}

export const portalLogin = (values: PortalLoginValues) => httpClient.post('/portal/auth/login', values)
export const changePortalPassword = ({ currentPassword, newPassword }: ChangePasswordValues) => httpClient.post('/portal/me/password', { currentPassword, newPassword })
export const portalLogout = () => httpClient.post('/portal/auth/logout')

export async function getPortalOrders(page: number) {
  const { data } = await httpClient.get<Paginated<PortalOrder>>('/portal/orders', { params: { page } })
  return data
}

export async function getPortalOrder(id: string) {
  const { data } = await httpClient.get<{ data: PortalOrderDetail }>(`/portal/orders/${id}`)
  return data.data
}

export async function getPortalTickets(page: number) {
  const { data } = await httpClient.get<Paginated<PortalTicket>>('/portal/tickets', { params: { page } })
  return data
}

export async function getPortalTicket(id: string) {
  const { data } = await httpClient.get<{ data: PortalTicketDetail }>(`/portal/tickets/${id}`)
  return data.data
}

export const createPortalTicket = (values: { subject: string; body: string }) => httpClient.post<{ data: PortalTicket }>('/portal/tickets', values)
export const replyToPortalTicket = (id: string, body: string) => httpClient.post(`/portal/tickets/${id}/messages`, { body })

export async function getPortalInvoices(page: number) {
  const { data } = await httpClient.get<Paginated<PortalInvoice>>('/portal/invoices', { params: { page } })
  return data
}

export async function getPortalInvoice(id: string) {
  const { data } = await httpClient.get<{ data: PortalInvoiceDetail }>(`/portal/invoices/${id}`)
  return data.data
}
