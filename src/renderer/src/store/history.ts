import { create } from 'zustand'
import type { HistoryEntry } from '@shared/types'

interface HistoryState {
  items: HistoryEntry[]
  load: () => Promise<void>
  clear: () => Promise<void>
}

export const useHistory = create<HistoryState>((set) => ({
  items: [],
  async load() {
    set({ items: await window.api.history.list() })
  },
  async clear() {
    await window.api.history.clear()
    set({ items: [] })
  }
}))
