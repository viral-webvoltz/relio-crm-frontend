import { z } from 'zod'

export const portalLoginSchema = z.object({
  organizationSlug: z.string().trim().min(1, 'Company ID is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export type PortalLoginValues = z.infer<typeof portalLoginSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'At least 8 characters').max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: 'Choose a different password', path: ['newPassword'] })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
