import { useEffect, useMemo, useRef, useState } from 'react'
import { useConnections } from '../store/connections'
import { useTabs } from '../store/tabs'
import { useHistory } from '../store/history'
import { exportRowsToCsv } from '../lib/exportCsv'

interface Props {
  open: boolean
  onClose: () => void
  onNewConnection: () => void
}

interface Action {
  id: string
  label: string
  hint?: string
  group: string
  run: () => void | Promise<void>
}

export function CommandPalette({ open, onClose, onNewConnection }: Props) {
  const connections = useConnections((s) => s.items)
  const activeConnId = useConnections((s) => s.activeId)
  const setActiveConn = useConnections((s) => s.setActive)
  const activeConn = connections.find((c) => c.id === activeConnId) ?? null

  const activeTab = useTabs((s) => s.tabs.find((t) => t.id === s.activeId)) ?? null
  const openQueryTab = useTabs((s) => s.openQueryTab)
  const runQuery = useTabs((s) => s.runQuery)

  const historyItems = useHistory((s) => s.items)
  const loadHistory = useHistory((s) => s.load)

  const [filter, setFilter] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setFilter('')
      setIndex(0)
      loadHistory()
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open, loadHistory])

  const actions = useMemo<Action[]>(() => {
    const list: Action[] = [
      {
        id: 'new-conn',
        label: 'New connection…',
        hint: '⌘N',
        group: 'Actions',
        run: onNewConnection
      }
    ]
    if (activeConn) {
      list.push({
        id: 'new-tab',
        label: 'New query tab',
        hint: '⌘T',
        group: 'Actions',
        run: () => {
          openQueryTab(activeConn.id)
        }
      })
    }
    if (activeTab?.kind === 'query') {
      list.push({
        id: 'run',
        label: 'Run query',
        hint: '⌘↩',
        group: 'Actions',
        run: () => runQuery(activeTab.id)
      })
    }
    if (activeTab?.kind === 'query') {
      const r = activeTab.results[activeTab.activeResultIndex]?.result
      if (r && r.rows.length > 0) {
        list.push({
          id: 'export-csv',
          label: 'Export results to CSV',
          hint: '⌘⇧E',
          group: 'Actions',
          run: () => exportRowsToCsv(`query_${Date.now()}`, r.columns, r.rows)
        })
      }
    }
    if (activeTab?.kind === 'table' && activeTab.data && activeTab.data.rows.length > 0) {
      list.push({
        id: 'export-csv',
        label: 'Export table page to CSV',
        hint: '⌘⇧E',
        group: 'Actions',
        run: () =>
          exportRowsToCsv(
            `${activeTab.ref.name}_page${activeTab.page + 1}`,
            activeTab.data!.columns,
            activeTab.data!.rows
          )
      })
    }
    for (const c of connections) {
      list.push({
        id: `conn-${c.id}`,
        label: `Switch to ${c.name}`,
        hint: `${c.driver} · ${c.host}`,
        group: 'Connections',
        run: () => setActiveConn(c.id)
      })
    }
    for (const h of historyItems.slice(0, 50)) {
      list.push({
        id: `hist-${h.id}`,
        label: h.sql.replace(/\s+/g, ' ').slice(0, 80),
        hint: `${h.connectionName} · ${h.ok ? 'ok' : 'error'}`,
        group: 'History',
        run: () => {
          if (activeConn) openQueryTab(activeConn.id, h.sql)
        }
      })
    }
    return list
  }, [
    connections,
    historyItems,
    activeConn,
    activeTab,
    onNewConnection,
    openQueryTab,
    runQuery,
    setActiveConn
  ])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return actions
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q)
    )
  }, [filter, actions])

  useEffect(() => {
    setIndex(0)
  }, [filter])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex((i) => Math.min(filtered.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        const a = filtered[index]
        if (a) {
          onClose()
          void a.run()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, index, onClose])

  if (!open) return null

  let currentGroup = ''
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-[12vh] no-drag">
      <div className="w-[560px] bg-surface-raised border border-line rounded-xl shadow-2xl overflow-hidden">
        <input
          ref={inputRef}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Type a command, connection name, or search history…"
          className="w-full bg-transparent px-4 py-3 text-sm text-fg outline-none border-b border-line/70"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-fg-subtle">No matches</div>
          )}
          {filtered.map((a, i) => {
            const showGroup = a.group !== currentGroup
            currentGroup = a.group
            return (
              <div key={a.id}>
                {showGroup && (
                  <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-fg-subtle">
                    {a.group}
                  </div>
                )}
                <button
                  className={`w-full flex items-center justify-between px-4 py-1.5 text-sm text-left ${
                    i === index ? 'bg-accent/15 text-fg' : 'text-fg-muted hover:bg-fg/5 hover:text-fg'
                  }`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => {
                    onClose()
                    void a.run()
                  }}
                >
                  <span className="truncate">{a.label}</span>
                  {a.hint && (
                    <span className="ml-3 text-[10px] text-fg-subtle shrink-0">{a.hint}</span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
