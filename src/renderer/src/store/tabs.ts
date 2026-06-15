import { create } from 'zustand'
import type {
  PendingMutation,
  QueryResult,
  TableFilter,
  TableForeignKey,
  TablePage,
  TableRef,
  TableStructure
} from '@shared/types'
import { detectDestructive } from '@shared/ipc'
import { splitStatements } from '@shared/sql'

let counter = 0
const nextId = (): string => `tab-${++counter}`

export interface QueryResultSet {
  statement: string
  result?: QueryResult
  error?: string
}

export interface QueryTab {
  kind: 'query'
  id: string
  connectionId: string
  title: string
  sql: string
  results: QueryResultSet[]
  activeResultIndex: number
  running: boolean
  savedQueryId?: string
}

export type TableSubview = 'data' | 'structure'

export interface PendingInsert {
  id: string
  values: Record<string, unknown>
}

export interface TableTab {
  kind: 'table'
  id: string
  connectionId: string
  title: string
  ref: TableRef
  view: TableSubview
  data: TablePage | null
  structure: TableStructure | null
  foreignKeys: TableForeignKey[]
  filter: TableFilter | null
  page: number
  pageSize: number
  sortColumn: string | null
  sortDir: 'asc' | 'desc'
  loading: boolean
  error: string | null
  /** Single-column PK, derived from structure. Editing is disabled when null. */
  primaryKey: string | null
  /** Stringified PK value → { column → new value } */
  pendingEdits: Record<string, Record<string, unknown>>
  /** Stringified PK values marked for deletion */
  pendingDeletes: string[]
  pendingInserts: PendingInsert[]
}

export type Tab = QueryTab | TableTab

const PERSIST_KEY = 'veexa:tabs'

interface PersistedTab {
  kind: 'query' | 'table'
  connectionId: string
  title: string
  sql?: string
  ref?: TableRef
  view?: TableSubview
  page?: number
  pageSize?: number
  sortColumn?: string | null
  sortDir?: 'asc' | 'desc'
  filter?: TableFilter | null
}

function persist(tabs: Tab[]): void {
  const persisted: PersistedTab[] = tabs.map((t) =>
    t.kind === 'query'
      ? { kind: 'query', connectionId: t.connectionId, title: t.title, sql: t.sql }
      : {
          kind: 'table',
          connectionId: t.connectionId,
          title: t.title,
          ref: t.ref,
          view: t.view,
          page: t.page,
          pageSize: t.pageSize,
          sortColumn: t.sortColumn,
          sortDir: t.sortDir,
          filter: t.filter
        }
  )
  localStorage.setItem(PERSIST_KEY, JSON.stringify(persisted))
}

function hydrate(): Tab[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PERSIST_KEY) ?? '[]') as PersistedTab[]
    return raw.map<Tab>((p) => {
      const id = nextId()
      if (p.kind === 'query') {
        return {
          kind: 'query',
          id,
          connectionId: p.connectionId,
          title: p.title,
          sql: p.sql ?? '',
          results: [],
          activeResultIndex: 0,
          running: false
        }
      }
      return {
        kind: 'table',
        id,
        connectionId: p.connectionId,
        title: p.title,
        ref: p.ref!,
        view: p.view ?? 'data',
        data: null,
        structure: null,
        foreignKeys: [],
        filter: p.filter ?? null,
        page: p.page ?? 0,
        pageSize: p.pageSize ?? 100,
        sortColumn: p.sortColumn ?? null,
        sortDir: p.sortDir ?? 'asc',
        loading: false,
        error: null,
        primaryKey: null,
        pendingEdits: {},
        pendingDeletes: [],
        pendingInserts: []
      }
    })
  } catch {
    return []
  }
}

interface TabsState {
  tabs: Tab[]
  activeId: string | null
  hydrated: boolean
  openQueryTab: (connectionId: string, sql?: string, savedQueryId?: string) => string
  openTableTab: (connectionId: string, ref: TableRef, filter?: TableFilter | null) => string
  closeTab: (id: string) => void
  closeForConnection: (connectionId: string) => void
  setActive: (id: string | null) => void
  patch: (id: string, patch: Partial<Tab>) => void
  setSql: (id: string, sql: string) => void
  runQuery: (id: string) => Promise<void>
  loadTableData: (id: string) => Promise<void>
  loadTableStructure: (id: string) => Promise<void>
  setTableView: (id: string, view: TableSubview) => void
  setTableSort: (id: string, column: string) => Promise<void>
  setTablePage: (id: string, page: number) => Promise<void>
  clearTableFilter: (id: string) => Promise<void>
  setActiveResult: (id: string, index: number) => void
  cancelQuery: (id: string) => Promise<void>
  editCell: (id: string, pkValue: unknown, column: string, value: unknown) => void
  markDelete: (id: string, pkValue: unknown) => void
  unmarkDelete: (id: string, pkValue: unknown) => void
  addInsert: (id: string) => string
  updateInsert: (id: string, insertId: string, column: string, value: unknown) => void
  removeInsert: (id: string, insertId: string) => void
  discardPending: (id: string) => void
  buildMutations: (id: string) => PendingMutation[]
  commitPending: (id: string) => Promise<void>
}

const persistedUpdate = (set: any) => (updater: (s: TabsState) => Partial<TabsState>) => {
  set((s: TabsState) => {
    const patch = updater(s)
    if (patch.tabs) persist(patch.tabs)
    return patch
  })
}

export const useTabs = create<TabsState>((set, get) => {
  const update = persistedUpdate(set)
  return {
    tabs: hydrate(),
    activeId: null,
    hydrated: true,

    openQueryTab(connectionId, sql, savedQueryId) {
      const id = nextId()
      const tab: QueryTab = {
        kind: 'query',
        id,
        connectionId,
        title: savedQueryId ? 'Saved' : 'Query',
        sql: sql ?? 'SELECT 1;',
        results: [],
        activeResultIndex: 0,
        running: false,
        savedQueryId
      }
      update(() => ({ tabs: [...get().tabs, tab], activeId: id }))
      return id
    },

    openTableTab(connectionId, ref, filter) {
      const existing = get().tabs.find(
        (t) =>
          t.kind === 'table' &&
          t.connectionId === connectionId &&
          t.ref.schema === ref.schema &&
          t.ref.name === ref.name &&
          ((!filter && !t.filter) ||
            (filter &&
              t.filter &&
              t.filter.column === filter.column &&
              t.filter.value === filter.value))
      )
      if (existing) {
        update(() => ({ activeId: existing.id }))
        return existing.id
      }
      const id = nextId()
      const tab: TableTab = {
        kind: 'table',
        id,
        connectionId,
        title: filter ? `${ref.name} [${filter.column}=${String(filter.value)}]` : ref.name,
        ref,
        view: 'data',
        data: null,
        structure: null,
        foreignKeys: [],
        filter: filter ?? null,
        page: 0,
        pageSize: 100,
        sortColumn: null,
        sortDir: 'asc',
        loading: false,
        error: null,
        primaryKey: null,
        pendingEdits: {},
        pendingDeletes: [],
        pendingInserts: []
      }
      update(() => ({ tabs: [...get().tabs, tab], activeId: id }))
      return id
    },

    closeTab(id) {
      const s = get()
      const idx = s.tabs.findIndex((t) => t.id === id)
      if (idx < 0) return
      const next = s.tabs.filter((t) => t.id !== id)
      let activeId = s.activeId
      if (activeId === id) {
        const fallback = next[idx] ?? next[idx - 1] ?? null
        activeId = fallback?.id ?? null
      }
      update(() => ({ tabs: next, activeId }))
    },

    closeForConnection(connectionId) {
      const s = get()
      const next = s.tabs.filter((t) => t.connectionId !== connectionId)
      const active = next.find((t) => t.id === s.activeId)
      update(() => ({ tabs: next, activeId: active?.id ?? null }))
    },

    setActive(id) {
      set({ activeId: id })
    },

    patch(id, patch) {
      update(() => ({
        tabs: get().tabs.map((t) => (t.id === id ? ({ ...t, ...patch } as Tab) : t))
      }))
    },

    setSql(id, sql) {
      get().patch(id, { sql } as Partial<Tab>)
    },

    async runQuery(id) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'query' || tab.running) return
      const statements = splitStatements(tab.sql)
      if (statements.length === 0) return
      const keyword = statements.map(detectDestructive).find(Boolean)
      if (keyword) {
        const ok = window.confirm(
          `This query contains a destructive statement (${keyword}).\n\nRun anyway?`
        )
        if (!ok) return
      }
      get().patch(id, { running: true, results: [], activeResultIndex: 0 } as Partial<QueryTab>)
      const results: QueryResultSet[] = []
      for (const stmt of statements) {
        try {
          const result = await window.api.session.query(tab.connectionId, stmt)
          results.push({ statement: stmt, result })
        } catch (err: any) {
          results.push({ statement: stmt, error: err?.message ?? String(err) })
          break
        }
      }
      get().patch(id, {
        running: false,
        results,
        activeResultIndex: 0
      } as Partial<QueryTab>)
    },

    async loadTableData(id) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return
      get().patch(id, { loading: true, error: null } as Partial<TableTab>)
      try {
        const data = await window.api.session.tableData(tab.connectionId, {
          ref: tab.ref,
          limit: tab.pageSize,
          offset: tab.page * tab.pageSize,
          sortColumn: tab.sortColumn ?? undefined,
          sortDir: tab.sortDir,
          filter: tab.filter ?? undefined
        })
        get().patch(id, { data, loading: false } as Partial<TableTab>)
        // Lazily fetch FKs + structure (for PK detection) on first data load.
        const after = get().tabs.find((t) => t.id === id) as TableTab | undefined
        if (after && after.foreignKeys.length === 0) {
          window.api.session
            .tableForeignKeys(tab.connectionId, tab.ref)
            .then((fks) => get().patch(id, { foreignKeys: fks } as Partial<TableTab>))
            .catch(() => {})
        }
        if (after && !after.structure) {
          void get().loadTableStructure(id)
        }
      } catch (err: any) {
        get().patch(id, {
          error: err?.message ?? String(err),
          loading: false,
          data: null
        } as Partial<TableTab>)
      }
    },

    async loadTableStructure(id) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table' || tab.structure) return
      try {
        const structure = await window.api.session.tableStructure(tab.connectionId, tab.ref)
        const pkCols = structure.columns.filter((c) => c.isPrimaryKey)
        const primaryKey = pkCols.length === 1 ? pkCols[0].name : null
        get().patch(id, { structure, primaryKey } as Partial<TableTab>)
      } catch (err: any) {
        get().patch(id, { error: err?.message ?? String(err) } as Partial<TableTab>)
      }
    },

    setTableView(id, view) {
      get().patch(id, { view } as Partial<TableTab>)
      if (view === 'structure') void get().loadTableStructure(id)
    },

    async setTableSort(id, column) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return
      const same = tab.sortColumn === column
      const nextDir: 'asc' | 'desc' = same && tab.sortDir === 'asc' ? 'desc' : 'asc'
      get().patch(id, { sortColumn: column, sortDir: nextDir, page: 0 } as Partial<TableTab>)
      await get().loadTableData(id)
    },

    async setTablePage(id, page) {
      get().patch(id, { page: Math.max(0, page) } as Partial<TableTab>)
      await get().loadTableData(id)
    },

    async clearTableFilter(id) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return
      get().patch(id, {
        filter: null,
        page: 0,
        title: tab.ref.name
      } as Partial<TableTab>)
      await get().loadTableData(id)
    },

    setActiveResult(id, index) {
      get().patch(id, { activeResultIndex: index } as Partial<QueryTab>)
    },

    async cancelQuery(id) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'query' || !tab.running) return
      try {
        await window.api.session.cancel(tab.connectionId)
      } catch {
        /* swallow — cancellation may race with query completion */
      }
    },

    editCell(id, pkValue, column, value) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return
      const key = String(pkValue)
      const existing = tab.pendingEdits[key] ?? {}
      const nextEdits = { ...tab.pendingEdits, [key]: { ...existing, [column]: value } }
      get().patch(id, { pendingEdits: nextEdits } as Partial<TableTab>)
    },

    markDelete(id, pkValue) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return
      const key = String(pkValue)
      if (tab.pendingDeletes.includes(key)) return
      get().patch(id, {
        pendingDeletes: [...tab.pendingDeletes, key]
      } as Partial<TableTab>)
    },

    unmarkDelete(id, pkValue) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return
      const key = String(pkValue)
      get().patch(id, {
        pendingDeletes: tab.pendingDeletes.filter((k) => k !== key)
      } as Partial<TableTab>)
    },

    addInsert(id) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return ''
      const insertId = `ins-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      get().patch(id, {
        pendingInserts: [...tab.pendingInserts, { id: insertId, values: {} }]
      } as Partial<TableTab>)
      return insertId
    },

    updateInsert(id, insertId, column, value) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return
      get().patch(id, {
        pendingInserts: tab.pendingInserts.map((p) =>
          p.id === insertId ? { ...p, values: { ...p.values, [column]: value } } : p
        )
      } as Partial<TableTab>)
    },

    removeInsert(id, insertId) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return
      get().patch(id, {
        pendingInserts: tab.pendingInserts.filter((p) => p.id !== insertId)
      } as Partial<TableTab>)
    },

    discardPending(id) {
      get().patch(id, {
        pendingEdits: {},
        pendingDeletes: [],
        pendingInserts: []
      } as Partial<TableTab>)
    },

    buildMutations(id) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table' || !tab.primaryKey) return []
      const pk = tab.primaryKey
      const out: PendingMutation[] = []

      // Updates: keyed by stringified PK; recover the original PK value from the data page.
      const pkIndex = tab.data?.columns.indexOf(pk) ?? -1
      const rawByKey = new Map<string, unknown>()
      if (tab.data && pkIndex >= 0) {
        for (const row of tab.data.rows) {
          rawByKey.set(String(row[pkIndex]), row[pkIndex])
        }
      }
      for (const [key, set] of Object.entries(tab.pendingEdits)) {
        if (tab.pendingDeletes.includes(key)) continue
        const pkValue = rawByKey.get(key) ?? key
        out.push({ kind: 'update', ref: tab.ref, pk: { column: pk, value: pkValue }, set })
      }
      for (const key of tab.pendingDeletes) {
        const pkValue = rawByKey.get(key) ?? key
        out.push({ kind: 'delete', ref: tab.ref, pk: { column: pk, value: pkValue } })
      }
      for (const ins of tab.pendingInserts) {
        if (Object.keys(ins.values).length === 0) continue
        out.push({ kind: 'insert', ref: tab.ref, values: ins.values })
      }
      return out
    },

    async commitPending(id) {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.kind !== 'table') return
      const mutations = get().buildMutations(id)
      if (mutations.length === 0) return
      await window.api.session.commitMutations(tab.connectionId, mutations)
      get().patch(id, {
        pendingEdits: {},
        pendingDeletes: [],
        pendingInserts: []
      } as Partial<TableTab>)
      await get().loadTableData(id)
    }
  }
})
