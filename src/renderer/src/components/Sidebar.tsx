import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  Database,
  Eye,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Table2,
  Trash2
} from 'lucide-react'
import { useConnections } from '../store/connections'
import { useUi } from '../store/ui'
import { useTabs } from '../store/tabs'
import { usePins } from '../store/pins'
import { useSavedQueries } from '../store/savedQueries'
import { useSchemaCache } from '../store/schemaCache'
import { setSchemaSuggestions } from '../lib/sqlAutocomplete'
import { modKey } from '../lib/platform'
import type { SchemaNode, TableRef } from '@shared/types'

export function Sidebar() {
  const { items, activeId, setActive, remove, load, disconnect } = useConnections()
  const openNew = useUi((s) => s.openNewConnection)
  const openEdit = useUi((s) => s.openEditConnection)
  const setConnectionError = useUi((s) => s.setConnectionError)
  const loadSchemaCache = useSchemaCache((s) => s.load)
  const openTableTab = useTabs((s) => s.openTableTab)
  const openCreateTableTab = useTabs((s) => s.openCreateTableTab)
  const openQueryTab = useTabs((s) => s.openQueryTab)
  const closeForConnection = useTabs((s) => s.closeForConnection)
  const pinsByConnection = usePins((s) => s.byConnection)
  const togglePin = usePins((s) => s.toggle)
  const savedItems = useSavedQueries((s) => s.items)
  const loadSaved = useSavedQueries((s) => s.load)
  const removeSaved = useSavedQueries((s) => s.remove)

  const [schema, setSchema] = useState<SchemaNode[]>([])
  const [opening, setOpening] = useState(false)
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({})

  const activeConnection = items.find((c) => c.id === activeId) ?? null

  useEffect(() => {
    load()
    loadSaved()
  }, [load, loadSaved])

  useEffect(() => {
    setSchema([])
    setFilter('')
    if (!activeId) return
    let cancelled = false
    setOpening(true)
    window.api.session
      .open(activeId)
      .then(() => window.api.session.schema(activeId))
      .then((s) => {
        if (cancelled) return
        setSchema(s)
        const initialExpanded: Record<string, boolean> = {}
        const initialSections: Record<string, boolean> = {}
        for (const sch of s) {
          initialExpanded[sch.name] = s.length === 1
          initialSections[`${sch.name}:tables`] = true
        }
        setExpanded(initialExpanded)
        setExpandedSection(initialSections)
        // Populate Monaco autocomplete with schema info.
        loadSchemaCache(activeId).then(() => {
          if (cancelled) return
          const cache = useSchemaCache.getState()
          if (cache.connectionId === activeId) {
            setSchemaSuggestions(cache.tables, cache.columns)
          }
        })
      })
      .catch((err) => {
        if (cancelled) return
        setConnectionError({
          connectionId: activeId,
          message: err?.message ?? String(err)
        })
      })
      .finally(() => !cancelled && setOpening(false))
    return () => {
      cancelled = true
    }
  }, [activeId])

  const filtered = useMemo(() => filterSchema(schema, filter), [schema, filter])
  const autoExpand = filter.length > 0
  const pinned = activeId ? (pinsByConnection[activeId] ?? []) : []
  const visibleSaved = useMemo(
    () =>
      savedItems.filter(
        (q) => q.connectionId === null || (activeId && q.connectionId === activeId)
      ),
    [savedItems, activeId]
  )

  const handleDisconnect = async () => {
    if (activeId) closeForConnection(activeId)
    await disconnect()
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col border-r border-line/70 bg-surface-raised">
      {/* Header: Disconnect bar when connected, Connections list when not */}
      {activeId && activeConnection ? (
        <>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line/70">
            <button
              onClick={handleDisconnect}
              className="no-drag p-1 rounded text-fg-muted hover:text-accent hover:bg-fg/5"
              title="Disconnect and go back"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-fg truncate">
                {activeConnection.name}
              </div>
              <div className="text-[10px] text-fg-subtle truncate">
                {activeConnection.driver} · {activeConnection.host}/{activeConnection.database}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-3 py-2 text-[10px] uppercase tracking-wider text-fg-subtle">
            <span>Connections</span>
            <button
              onClick={openNew}
              className="no-drag p-1 -mr-1 rounded text-fg-muted hover:text-accent hover:bg-fg/5"
              title={`New connection (${modKey()}N)`}
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="px-2 space-y-0.5">
            {items.map((c) => {
              const active = activeId === c.id
              return (
                <div
                  key={c.id}
                  className={`group rounded-md px-2 py-1.5 text-sm cursor-pointer flex items-center justify-between ${
                    active
                      ? 'bg-accent/15 text-fg border-l-2 border-accent -ml-[2px] pl-[10px]'
                      : 'text-fg-muted hover:bg-fg/5 hover:text-fg'
                  }`}
                  onClick={() => setActive(c.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Database
                      size={14}
                      className={active ? 'text-accent shrink-0' : 'text-fg-subtle shrink-0'}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[13px]">{c.name}</div>
                      <div className="text-[10px] text-fg-subtle truncate">
                        {c.driver} · {c.host}/{c.database}
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0">
                    <button
                      className="p-1 text-fg-muted hover:text-fg rounded"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(c.id)
                      }}
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className="p-1 text-fg-subtle hover:text-danger rounded"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete connection "${c.name}"?`)) {
                          closeForConnection(c.id)
                          remove(c.id)
                        }
                      }}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
            {items.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-fg-subtle">
                No connections yet.
                <br />
                Click + to create one.
              </div>
            )}
          </div>
        </>
      )}

      {activeId && (
        <>
          {pinned.length > 0 && (
            <div className="mt-3 px-2">
              <div className="px-1 mb-1 text-[10px] uppercase tracking-wider text-fg-subtle">
                Pinned
              </div>
              {pinned.map((p) => (
                <div
                  key={`${p.schema}.${p.name}`}
                  onClick={() => openTableTab(activeId, p)}
                  className="group flex items-center gap-1.5 text-xs text-fg-muted hover:bg-fg/5 hover:text-fg px-1 py-0.5 rounded cursor-default"
                  title={`${p.schema}.${p.name}`}
                >
                  <Pin size={11} className="text-accent shrink-0" />
                  <span className="truncate flex-1">{p.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePin(activeId, p)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-fg-subtle hover:text-danger"
                    title="Unpin"
                  >
                    <PinOff size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="px-2 pt-3 pb-2">
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <Search
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-subtle"
                />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter tables…"
                  className="w-full bg-surface border border-line rounded-md pl-7 pr-2 py-1 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent/70"
                />
              </div>
              <button
                onClick={() => openCreateTableTab(activeId)}
                className="p-1.5 rounded-md border border-line text-fg-subtle hover:text-accent hover:border-accent/60"
                title="Create New Table"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {opening && <div className="px-1 text-xs text-fg-subtle">Connecting…</div>}
            {!opening && filtered.length === 0 && filter && (
              <div className="px-1 text-xs text-fg-subtle">No matches</div>
            )}
            {!opening &&
              filtered.map((sch) => {
                const isExpanded = autoExpand || !!expanded[sch.name]
                const tables = sch.children?.filter((c) => c.kind === 'table') ?? []
                const views = sch.children?.filter((c) => c.kind === 'view') ?? []
                return (
                  <div key={sch.name} className="mb-2">
                    <button
                      className="w-full flex items-center gap-1 text-xs text-fg hover:text-accent py-0.5"
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [sch.name]: !e[sch.name] }))
                      }
                    >
                      <Chevron open={isExpanded} />
                      <span className="truncate">{sch.name}</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-3 mt-0.5">
                        <Section
                          label="Tables"
                          count={tables.length}
                          open={autoExpand || !!expandedSection[`${sch.name}:tables`]}
                          onToggle={() =>
                            setExpandedSection((e) => ({
                              ...e,
                              [`${sch.name}:tables`]: !e[`${sch.name}:tables`]
                            }))
                          }
                        >
                          {tables.map((t) => {
                            const ref: TableRef = { schema: sch.name, name: t.name }
                            return (
                              <SchemaItem
                                key={t.name}
                                name={t.name}
                                kind="table"
                                pinned={!!pinsByConnection[activeId]?.some(
                                  (r) => r.schema === ref.schema && r.name === ref.name
                                )}
                                onActivate={() => openTableTab(activeId, ref)}
                                onTogglePin={() => togglePin(activeId, ref)}
                              />
                            )
                          })}
                        </Section>
                        {views.length > 0 && (
                          <Section
                            label="Views"
                            count={views.length}
                            open={autoExpand || !!expandedSection[`${sch.name}:views`]}
                            onToggle={() =>
                              setExpandedSection((e) => ({
                                ...e,
                                [`${sch.name}:views`]: !e[`${sch.name}:views`]
                              }))
                            }
                          >
                            {views.map((v) => {
                              const ref: TableRef = { schema: sch.name, name: v.name }
                              return (
                                <SchemaItem
                                  key={v.name}
                                  name={v.name}
                                  kind="view"
                                  pinned={!!pinsByConnection[activeId]?.some(
                                    (r) => r.schema === ref.schema && r.name === ref.name
                                  )}
                                  onActivate={() => openTableTab(activeId, ref)}
                                  onTogglePin={() => togglePin(activeId, ref)}
                                />
                              )
                            })}
                          </Section>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

            {visibleSaved.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-fg-subtle py-0.5 px-1">
                  <Bookmark size={10} className="text-accent" />
                  Saved Queries
                </div>
                {visibleSaved.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => openQueryTab(q.connectionId ?? activeId, q.sql, q.id)}
                    className="group flex items-center gap-1.5 text-xs text-fg-muted hover:bg-fg/5 hover:text-fg px-1 py-0.5 rounded cursor-default ml-3"
                    title={q.name}
                  >
                    <span className="truncate flex-1">{q.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete saved query "${q.name}"?`)) removeSaved(q.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-fg-subtle hover:text-danger"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}

function Section({
  label,
  count,
  open,
  onToggle,
  children
}: {
  label: string
  count: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-fg-subtle hover:text-fg-muted py-0.5"
      >
        <Chevron open={open} small />
        <span>
          {label} <span className="text-fg-subtle/60">{count}</span>
        </span>
      </button>
      {open && <div className="ml-3">{children}</div>}
    </div>
  )
}

function SchemaItem({
  name,
  kind,
  pinned,
  onActivate,
  onTogglePin
}: {
  name: string
  kind: 'table' | 'view'
  pinned: boolean
  onActivate: () => void
  onTogglePin: () => void
}) {
  const Icon = kind === 'view' ? Eye : Table2
  return (
    <div
      onDoubleClick={onActivate}
      onClick={onActivate}
      className="group text-xs text-fg-muted py-0.5 px-1 truncate hover:bg-fg/5 hover:text-fg rounded cursor-default flex items-center gap-1.5"
      title={name}
    >
      <Icon size={12} className="text-accent/70 shrink-0" />
      <span className="truncate flex-1">{name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onTogglePin()
        }}
        className={`p-0.5 ${
          pinned
            ? 'text-accent opacity-100'
            : 'text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-accent'
        }`}
        title={pinned ? 'Unpin' : 'Pin'}
      >
        <Pin size={10} />
      </button>
    </div>
  )
}

function Chevron({ open, small }: { open: boolean; small?: boolean }) {
  return (
    <ChevronRight
      size={small ? 10 : 12}
      className={`text-fg-subtle transition-transform ${open ? 'rotate-90' : ''}`}
    />
  )
}

function filterSchema(schemas: SchemaNode[], filter: string): SchemaNode[] {
  if (!filter.trim()) return schemas
  const q = filter.trim().toLowerCase()
  return schemas
    .map((s) => ({
      ...s,
      children: s.children?.filter((c) => c.name.toLowerCase().includes(q)) ?? []
    }))
    .filter((s) => (s.children?.length ?? 0) > 0 || s.name.toLowerCase().includes(q))
}

