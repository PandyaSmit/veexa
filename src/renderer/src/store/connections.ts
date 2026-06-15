import { create } from 'zustand'
import type { ConnectionConfig, ConnectionDraft } from '@shared/types'

interface ConnectionsState {
  items: ConnectionConfig[]
  activeId: string | null
  loaded: boolean
  load: () => Promise<void>
  upsert: (draft: ConnectionDraft & { id?: string }) => Promise<ConnectionConfig>
  remove: (id: string) => Promise<void>
  setActive: (id: string | null) => void
}

export const useConnections = create<ConnectionsState>((set, get) => ({
  items: [],
  activeId: null,
  loaded: false,
  async load() {
    const items = await window.api.connections.list()
    set({ items, loaded: true })
  },
  async upsert(draft) {
    const saved = await window.api.connections.upsert(draft)
    const items = get().items
    const idx = items.findIndex((i) => i.id === saved.id)
    const next = idx >= 0 ? items.map((i) => (i.id === saved.id ? saved : i)) : [...items, saved]
    set({ items: next })
    return saved
  },
  async remove(id) {
    await window.api.connections.delete(id)
    set({
      items: get().items.filter((i) => i.id !== id),
      activeId: get().activeId === id ? null : get().activeId
    })
  },
  setActive(id) {
    set({ activeId: id })
  }
}))
