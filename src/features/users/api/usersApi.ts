import { httpClient } from '@/lib/httpClient'
import type { CreateUserFormValues, EditUserFormValues } from '../schemas/userSchema'
import type { User, UserOption } from '../types'

export async function getUsers() {
  const { data } = await httpClient.get<{ data: User[] }>('/users')
  return data.data
}

export async function getUserOptions() {
  const { data } = await httpClient.get<{ data: UserOption[] }>('/users/options')
  return data.data
}

export const createUser = (values: CreateUserFormValues) => httpClient.post('/users', values)

export const updateUser = (id: string, { password, ...rest }: EditUserFormValues) =>
  httpClient.patch(`/users/${id}`, { ...rest, ...(password && { password }) })
