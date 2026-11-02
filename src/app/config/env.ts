// Empty means "same origin": requests go through the Vite dev proxy.
// Plain read instead of a zod schema: zod is ~100 kB and this is the only eager use of it.
export const env = { VITE_API_URL: (import.meta.env.VITE_API_URL as string | undefined) ?? '' }
