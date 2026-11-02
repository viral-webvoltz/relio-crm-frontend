export type Tag = { id: string; name: string; color: string }
/** The tag list also says how many (not deleted) contacts use each tag. */
export type TagWithCount = Tag & { usageCount: number; createdAt: string }
export type TaggedContact = { id: string; firstName: string; lastName: string | null; email: string | null }

export const MAX_TAGS_PER_CONTACT = 20

// The server's palette. Colours are decoration only: a tag is always identified by its name too.
export const tagColors = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
] as const

export const colorName = (value: string) => tagColors.find((c) => c.value === value.toLowerCase())?.name ?? 'Custom colour'
