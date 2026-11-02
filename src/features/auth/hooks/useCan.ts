import { useCurrentUser } from './useAuth'

// UI hint only: the backend enforces every permission.
export function useCan(permission: string) {
  const { data: user } = useCurrentUser()
  return user?.permissions.includes(permission) ?? false
}
