import { createContext } from 'react'
import type { Kind } from './graph'

/** Outcome of the last test per step id, so the path a sample took lights up on the canvas. */
export const TraceContext = createContext<Record<string, string> | null>(null)

/** What the "+" buttons and the step toolbar do; provided by the editor, used by nodes and edges. */
export type EditorActions = {
  addAfter: (sourceId: string, handle: string, kind: Kind) => void
  insertOnEdge: (edgeId: string, kind: Kind) => void
  duplicate: (id: string) => void
  remove: (id: string) => void | Promise<void>
}
export const ActionsContext = createContext<EditorActions | null>(null)
