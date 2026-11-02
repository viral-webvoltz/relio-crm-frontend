export type Role = {
  id: string
  name: string
  isSystem: boolean
  permissions: string[]
  userCount: number
}

export type RolesResponse = { roles: Role[]; allPermissions: string[] }
