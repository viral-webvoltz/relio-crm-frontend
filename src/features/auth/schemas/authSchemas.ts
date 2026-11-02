import { z } from 'zod'

export const loginSchema = z.object({
  organizationSlug: z.string().trim().optional(),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2, 'At least 2 characters'),
  fullName: z.string().trim().min(2, 'At least 2 characters'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
})

// The server accepts 8 to 128 characters for any new password.
const newPassword = z.string().min(8, 'Use at least 8 characters').max(128, 'Use at most 128 characters')
const matches = (data: { newPassword: string; confirmPassword: string }, ctx: z.RefinementCtx) => {
  if (data.newPassword !== data.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'The two passwords do not match' })
}

export const forgotPasswordSchema = z.object({ email: z.string().trim().email('Enter a valid email') })

export const resetPasswordSchema = z.object({ newPassword, confirmPassword: z.string() }).superRefine(matches)

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password').max(128), newPassword, confirmPassword: z.string() })
  .superRefine(matches)
  .superRefine((data, ctx) => {
    if (data.newPassword && data.newPassword === data.currentPassword) ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'Choose a password you have not used just now' })
  })

// Authenticator-app code: six digits, spaces tolerated while typing.
export const appCode = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your app'))

// A recovery code looks like ABCDE-FGHJK; the server ignores case, spaces and the dash.
export const recoveryCode = z.string().trim().min(8, 'Enter one of your recovery codes').max(20, 'That code is too long')

export const setupPasswordSchema = z.object({ password: z.string().min(1, 'Enter your password') })
export const codeSchema = z.object({ code: appCode })
export const disableTwoFactorSchema = z.object({ password: z.string().min(1, 'Enter your password'), factor: z.string().trim().min(6, 'Enter a code') })
export const regenerateSchema = z.object({ password: z.string().min(1, 'Enter your password'), code: appCode })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
