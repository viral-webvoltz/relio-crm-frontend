import { httpClient } from '@/lib/httpClient'
import type { RoleFormValues } from '../schemas/roleSchema'
import type { RolesResponse } from '../types'

export async function getRoles() {
  const { data } = await httpClient.get<{ data: RolesResponse }>('/roles')
  return data.data
}

export const createRole = (values: RoleFormValues) => httpClient.post('/roles', values)
export const updateRole = (id: string, values: RoleFormValues) => httpClient.patch(`/roles/${id}`, values)
export const deleteRole = (id: string) => httpClient.delete(`/roles/${id}`)
