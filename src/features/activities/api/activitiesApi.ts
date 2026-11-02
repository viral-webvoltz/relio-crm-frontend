import { httpClient } from '@/lib/httpClient'
import type { ActivityFormValues } from '../schemas/activitySchema'
import type { Activity, RelatedType } from '../types'

export async function getActivities(relatedType: RelatedType, relatedId: string) {
  const { data } = await httpClient.get<{ data: Activity[] }>('/activities', { params: { relatedType, relatedId } })
  return data.data
}

export async function getRecentActivities() {
  const { data } = await httpClient.get<{ data: Activity[] }>('/activities/recent', { params: { limit: 50 } })
  return data.data
}

export const createActivity = (relatedType: RelatedType, relatedId: string, values: ActivityFormValues) =>
  httpClient.post('/activities', { ...values, relatedType, relatedId })

export const updateActivity = (id: string, values: ActivityFormValues) => httpClient.patch(`/activities/${id}`, values)

export const deleteActivity = (id: string) => httpClient.delete(`/activities/${id}`)
