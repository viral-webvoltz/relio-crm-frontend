// Types and wording shared by the customer portal pages and the staff pages that manage the same records.
export type AppointmentStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'completed'

export type PortalNotice = { id: string; title: string; body: string; publishedAt: string | null; expiresAt: string | null }
export type PortalDocument = { id: string; name: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: string }
export type PortalAppointment = {
  id: string
  subject: string
  notes: string | null
  startsAt: string
  durationMinutes: number
  status: AppointmentStatus
  createdAt: string
  updatedAt: string
}
export type PortalProfile = { name: string; firstName: string; lastName: string | null; phone: string | null; email: string; organizationName: string; mustChangePassword: boolean }

// Plain-language names for customers; staff see the same words so both sides talk about the same thing.
export const appointmentLabel: Record<AppointmentStatus, string> = {
  requested: 'Waiting for confirmation',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
}
export const appointmentTone = { requested: 'warning', confirmed: 'success', declined: 'danger', cancelled: 'neutral', completed: 'info' } as const

export const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240] as const

export const formatFileSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)
