export type Team = { id: string; name: string; description: string | null; createdAt: string; memberCount: number }

export type TeamMember = { id: string; fullName: string; email: string; isActive: boolean }
export type TeamDetail = { id: string; name: string; description: string | null; createdAt: string; members: TeamMember[] }

export type TeamPayload = { name: string; description?: string | null }
