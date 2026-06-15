import { create } from 'zustand'
import type { TableRef } from '@shared/types'

const KEY = 'veexa:pins'

type PinMap = Record<string, TableRef[]>

function load(): PinMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as PinMap
  } catch {
    return {}
  }
}

function persist(map: PinMap): void {
  localStorage.setItem(KEY, JSON.stringify(map))
}

function sameRef(a: TableRef, b: TableRef): boolean {
  return a.schema === b.schema && a.name === b.name
}

interface PinsState {
  byConnection: PinMap
  list: (connectionId: string) => TableRef[]
  isPinned: (connectionId: string, ref: TableRef) => boolean
  toggle: (connectionId: string, ref: TableRef) => void
}

export const usePins = create<PinsState>((set, get) => ({
  byConnection: load(),
  list(connectionId) {
    return get().byConnection[connectionId] ?? []
  },
  isPinned(connectionId, ref) {
    return get().list(connectionId).some((r) => sameRef(r, ref))
  },
  toggle(connectionId, ref) {
    const map = { ...get().byConnection }
    const current = map[connectionId] ?? []
    const idx = current.findIndex((r) => sameRef(r, ref))
    map[connectionId] = idx >= 0 ? current.filter((_, i) => i !== idx) : [...current, ref]
    persist(map)
    set({ byConnection: map })
  }
}))
