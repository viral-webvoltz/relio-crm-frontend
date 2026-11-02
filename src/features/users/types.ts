export type User = {
  id: string
  email: string
  fullName: string
  isActive: boolean
  roles: { id: string; name: string }[]
}

export type UserOption = { id: string; fullName: string }
