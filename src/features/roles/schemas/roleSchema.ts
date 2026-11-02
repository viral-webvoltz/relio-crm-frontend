import { z } from 'zod'

export const roleFormSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(60),
  permissions: z.array(z.string()),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>
