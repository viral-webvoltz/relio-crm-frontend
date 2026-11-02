import { useState } from 'react'

// Selection is per visible page: it resets whenever the set of rows changes (new page, filter, sort, or after a bulk action).
export function useRowSelection<T>(rows: readonly T[] | undefined, rowKey: (row: T) => string) {
  const ids = (rows ?? []).map(rowKey)
  const signature = ids.join('|')
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [seen, setSeen] = useState(signature)

  if (seen !== signature) {
    setSeen(signature)
    setSelected(new Set())
  }

  return { selected, setSelected, clear: () => setSelected(new Set()), ids }
}
