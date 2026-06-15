import { create } from 'zustand'
import type { ColumnInfo } from '@shared/types'

interface SchemaCacheState {
  connectionId: string | null
  columns: ColumnInfo[]
  tables: { schema: string; table: string }[]
  loading: boolean
  load: (connectionId: string) => Promise<void>
  clear: () => void
}

export const useSchemaCache = create<SchemaCacheState>((set) => ({
  connectionId: null,
  columns: [],
  tables: [],
  loading: false,
  async load(connectionId) {
    set({ loading: true })
    try {
      const cols = await window.api.session.columns(connectionId)
      const tableMap = new Map<string, { schema: string; table: string }>()
      for (const c of cols) {
        const key = `${c.schema}.${c.table}`
        if (!tableMap.has(key)) tableMap.set(key, { schema: c.schema, table: c.table })
      }
      set({
        connectionId,
        columns: cols,
        tables: [...tableMap.values()],
        loading: false
      })
    } catch {
      set({ loading: false })
    }
  },
  clear() {
    set({ connectionId: null, columns: [], tables: [] })
  }
}))
