import { useState, useEffect } from 'react'
import { Plus, X, Trash2, Code, Play, Undo2 } from 'lucide-react'
import type { TableTab } from '../../store/tabs'
import type { AlterTableDefinition, AlterColumnAction, CreateTableColumn } from '@shared/types'
import { useTabs } from '../../store/tabs'

interface Props {
  tab: TableTab
  onClose: () => void
}

export function StructureEditor({ tab, onClose }: Props) {
  const [columns, setColumns] = useState<CreateTableColumn[]>([])
  const [originalCols, setOriginalCols] = useState<Record<string, CreateTableColumn>>({})
  const [dropped, setDropped] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!tab.structure) return
    const init: CreateTableColumn[] = tab.structure.columns.map(c => ({
      name: c.name,
      type: c.type,
      nullable: c.nullable,
      defaultValue: c.default,
      isPrimaryKey: c.isPrimaryKey
    }))
    setColumns(init)
    const map: Record<string, CreateTableColumn> = {}
    init.forEach(c => { map[c.name] = { ...c } })
    setOriginalCols(map)
  }, [tab.structure])

  const addColumn = () => {
    setColumns([
      ...columns,
      { name: '', type: 'VARCHAR(255)', nullable: true, defaultValue: null, isPrimaryKey: false }
    ])
  }

  const updateColumn = (index: number, patch: Partial<CreateTableColumn>) => {
    const next = [...columns]
    next[index] = { ...next[index], ...patch }
    setColumns(next)
  }

  const removeColumn = (index: number) => {
    const c = columns[index]
    if (originalCols[c.name]) {
      setDropped([...dropped, c.name])
    }
    setColumns(columns.filter((_, i) => i !== index))
  }

  const undoDrop = (name: string) => {
    setDropped(dropped.filter(n => n !== name))
    setColumns([...columns, originalCols[name]])
  }

  const buildDef = (): AlterTableDefinition => {
    const actions: AlterColumnAction[] = []
    
    // Add & Modify
    columns.forEach(c => {
      const orig = originalCols[c.name]
      if (!orig) {
        if (c.name.trim()) actions.push({ kind: 'add', column: c })
      } else {
        const changes: Partial<CreateTableColumn> = {}
        if (c.type !== orig.type) changes.type = c.type
        if (c.nullable !== orig.nullable) changes.nullable = c.nullable
        if (c.defaultValue !== orig.defaultValue) changes.defaultValue = c.defaultValue
        if (Object.keys(changes).length > 0) {
          actions.push({ kind: 'modify', column: orig.name, changes })
        }
      }
    })

    // Drop
    dropped.forEach(d => {
      actions.push({ kind: 'drop', column: d })
    })

    return { actions }
  }

  const handlePreview = async () => {
    try {
      const sql = await window.api.session.previewAlterTable(tab.connectionId, tab.ref, buildDef())
      setPreview(sql.join('\n'))
      if (sql.length > 0) navigator.clipboard.writeText(sql.join('\n'))
    } catch (err: any) {
      setError(err?.message ?? String(err))
    }
  }

  const handleExecute = async () => {
    const def = buildDef()
    if (def.actions.length === 0) {
      onClose()
      return
    }

    setLoading(true)
    setError(null)
    try {
      await window.api.session.alterTable(tab.connectionId, tab.ref, def)
      const loadStructure = useTabs.getState().loadTableStructure
      await loadStructure(tab.id)
      onClose()
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto p-6 bg-surface text-fg text-sm">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium flex items-center gap-2">
            Alter Table: {tab.ref.name}
          </h1>
          <button
            onClick={onClose}
            className="p-1 rounded text-fg-muted hover:text-fg hover:bg-fg/5"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-danger/10 border border-danger/30 text-danger rounded text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div className="bg-surface-elevated border border-line rounded-md overflow-hidden mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-raised border-b border-line text-xs text-fg-subtle">
                <th className="px-3 py-2 font-medium w-64">Column Name</th>
                <th className="px-3 py-2 font-medium w-48">Type</th>
                <th className="px-3 py-2 font-medium w-24">Nullable</th>
                <th className="px-3 py-2 font-medium w-32">Default</th>
                <th className="px-3 py-2 font-medium w-12" />
              </tr>
            </thead>
            <tbody>
              {columns.map((col, i) => {
                const isOrig = !!originalCols[col.name]
                return (
                  <tr key={i} className="border-b border-line/60 last:border-0 group">
                    <td className="px-2 py-1.5">
                      <input
                        value={col.name}
                        readOnly={isOrig}
                        onChange={e => updateColumn(i, { name: e.target.value })}
                        placeholder="name"
                        className={`w-full bg-transparent border border-transparent rounded px-2 py-1 outline-none text-sm ${isOrig ? 'opacity-80' : 'focus:border-accent focus:bg-surface'}`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={col.type}
                        onChange={e => updateColumn(i, { type: e.target.value })}
                        placeholder="VARCHAR(255)"
                        className="w-full bg-transparent border border-transparent rounded px-2 py-1 outline-none focus:border-accent focus:bg-surface text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={col.nullable}
                        onChange={e => updateColumn(i, { nullable: e.target.checked })}
                        className="rounded border-line/60 bg-surface accent-accent"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={col.defaultValue || ''}
                        onChange={e => updateColumn(i, { defaultValue: e.target.value || null })}
                        placeholder="NULL"
                        className="w-full bg-transparent border border-transparent rounded px-2 py-1 outline-none focus:border-accent focus:bg-surface text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {!isOrig || !col.isPrimaryKey ? (
                        <button
                          onClick={() => removeColumn(i)}
                          className="p-1.5 rounded text-fg-muted opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger/10"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              {dropped.map(d => (
                <tr key={d} className="border-b border-line/60 last:border-0 bg-danger/5">
                  <td className="px-4 py-2.5 line-through text-danger opacity-70">
                    {d}
                  </td>
                  <td colSpan={3} className="text-xs text-danger opacity-70 italic">
                    Will be dropped
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => undoDrop(d)}
                      className="p-1.5 rounded text-fg-muted hover:text-accent hover:bg-accent/10"
                      title="Undo Drop"
                    >
                      <Undo2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 border-t border-line bg-surface-raised/30">
            <button
              onClick={addColumn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-fg-muted hover:text-fg hover:bg-surface"
            >
              <Plus size={14} />
              Add Column
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleExecute}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-accent-fg font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Play size={16} />
            {loading ? 'Applying...' : 'Apply Changes'}
          </button>
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-surface-elevated border border-line text-fg hover:border-line/80 transition-colors"
          >
            <Code size={16} className="text-fg-muted" />
            Preview SQL
          </button>
        </div>

        {preview && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-fg-subtle uppercase tracking-wider">Preview</span>
              <span className="text-[10px] text-accent">Copied to clipboard</span>
            </div>
            <pre className="p-4 bg-[#0d0d0d] border border-line/40 rounded-md text-xs font-mono text-blue-300 overflow-auto max-h-64 whitespace-pre-wrap">
              {preview || '-- No changes to apply'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
