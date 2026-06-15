import { create } from 'zustand'
import type { SavedQuery } from '@shared/types'

interface SavedQueriesState {
  items: SavedQuery[]
  load: () => Promise<void>
  upsert: (q: SavedQuery) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useSavedQueries = create<SavedQueriesState>((set, get) => ({
  items: [],
  async load() {
    set({ items: await window.api.savedQueries.list() })
  },
  async upsert(q) {
    await window.api.savedQueries.upsert(q)
    const items = get().items
    const idx = items.findIndex((i) => i.id === q.id)
    set({ items: idx >= 0 ? items.map((i) => (i.id === q.id ? q : i)) : [q, ...items] })
  },
  async remove(id) {
    await window.api.savedQueries.delete(id)
    set({ items: get().items.filter((i) => i.id !== id) })
  }
}))
