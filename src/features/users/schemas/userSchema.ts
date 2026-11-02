import { z } from 'zod'

export const createUserFormSchema = z.object({
  fullName: z.string().trim().min(2, 'At least 2 characters').max(100),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  roleIds: z.array(z.string()).min(1, 'Select at least one role'),
})

// On edit the password is optional: blank means "leave unchanged".
export const editUserFormSchema = z.object({
  fullName: z.string().trim().min(2, 'At least 2 characters').max(100),
  isActive: z.boolean(),
  password: z.string().refine((v) => v === '' || v.length >= 8, 'At least 8 characters'),
  roleIds: z.array(z.string()).min(1, 'Select at least one role'),
})

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>
export type EditUserFormValues = z.infer<typeof editUserFormSchema>
