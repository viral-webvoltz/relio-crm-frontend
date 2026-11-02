export type PageMeta = { page: number; limit: number; total: number; totalPages: number }
export type Paginated<T> = { data: T[]; meta: PageMeta }

export const PAGE_SIZES = [10, 20, 50, 100] as const
export type SortDir = 'asc' | 'desc'
export type ListParams = { page: number; search: string; limit?: number; sort?: string; dir?: SortDir }

// Reads page, search, page size and sort from URL query params; bad values fall back to defaults.
// `allowedSorts` keeps a stale or hand-edited URL from asking the API for a field it would reject.
export function parseListParams(searchParams: URLSearchParams, allowedSorts: readonly string[] = []): ListParams {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const limit = Number.parseInt(searchParams.get('limit') ?? '', 10)
  const sort = searchParams.get('sort') ?? ''
  const dir = searchParams.get('dir')
  const validSort = allowedSorts.includes(sort)
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    search: searchParams.get('search') ?? '',
    limit: (PAGE_SIZES as readonly number[]).includes(limit) ? limit : undefined,
    sort: validSort ? sort : undefined,
    dir: validSort ? (dir === 'desc' ? 'desc' : 'asc') : undefined,
  }
}
