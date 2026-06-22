import { useState, useEffect } from 'react'
import { Plus, X, Trash2, Copy, Play } from 'lucide-react'
import { useConnections } from '../../store/connections'
import { useTabs, type CreateTableTab } from '../../store/tabs'
import type { CreateTableColumn, CreateTableDefinition } from '@shared/types'
import { useSchemaCache } from '../../store/schemaCache'

interface Props {
  tab: CreateTableTab
}

export function CreateTableView({ tab }: Props) {
  const connection = useConnections((s) => s.items.find((c) => c.id === tab.connectionId)) ?? null
  const loadSchema = useSchemaCache((s) => s.load)
  const [schemas, setSchemas] = useState<string[]>([])
  
  const [tableName, setTableName] = useState('')
  const [schema, setSchema] = useState('')
  const [columns, setColumns] = useState<CreateTableColumn[]>([
    { name: 'id', type: 'INT', nullable: false, defaultValue: null, isPrimaryKey: true }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    loadSchema(tab.connectionId).then(() => {
      const cache = useSchemaCache.getState()
      if (cache.connectionId === tab.connectionId) {
        const uniqueSchemas = Array.from(new Set(cache.tables.map(t => t.schema)))
        setSchemas(uniqueSchemas)
        if (uniqueSchemas.length > 0 && !schema) {
          setSchema(uniqueSchemas[0])
        }
      }
    })
  }, [tab.connectionId, loadSchema])

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
    setColumns(columns.filter((_, i) => i !== index))
  }

  const getDef = (): CreateTableDefinition => ({
    schema,
    tableName,
    columns: columns.filter(c => c.name.trim() !== '')
  })

  const handlePreview = async () => {
    if (!tableName.trim()) return
    try {
      const sql = await window.api.session.previewCreateTable(tab.connectionId, getDef())
      setPreview(sql)
      navigator.clipboard.writeText(sql)
    } catch (err: any) {
      setError(err?.message ?? String(err))
    }
  }

  const handleExecute = async () => {
    if (!tableName.trim() || !schema) {
      setError("Table name and schema are required")
      return
    }
    const def = getDef()
    if (def.columns.length === 0) {
      setError("At least one column with a name is required")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await window.api.session.createTable(tab.connectionId, def)
      // Success! Close this tab and open the table data tab
      const openTableTab = useTabs.getState().openTableTab
      const closeTab = useTabs.getState().closeTab
      window.dispatchEvent(new CustomEvent('schema-changed'))
      closeTab(tab.id)
      openTableTab(tab.connectionId, { schema, name: tableName })
      // Trigger a sidebar refresh by reopening session or similar...
      window.api.session.schema(tab.connectionId).catch(() => {})
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface text-fg p-6 overflow-auto">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-xl font-medium mb-6 flex items-center gap-2">
          Create Table
        </h1>

        {error && (
          <div className="mb-6 p-3 bg-danger/10 border border-danger/30 text-danger rounded text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div className="flex gap-4 mb-8">
          <div className="flex flex-col gap-1.5 w-48">
            <label className="text-xs font-medium text-fg-muted uppercase tracking-wider">Schema</label>
            <input 
              value={schema}
              onChange={e => setSchema(e.target.value)}
              list="schema-list"
              className="bg-surface-elevated border border-line rounded px-2 py-1.5 text-sm outline-none focus:border-accent"
              placeholder="e.g. public"
            />
            <datalist id="schema-list">
              {schemas.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-medium text-fg-muted uppercase tracking-wider">Table Name</label>
            <input 
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              placeholder="e.g. users"
              className="bg-surface-elevated border border-line rounded px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <label className="text-xs font-medium text-fg-muted uppercase tracking-wider">Columns</label>
          <button 
            onClick={addColumn}
            className="flex items-center gap-1 text-xs text-accent hover:opacity-80 font-medium"
          >
            <Plus size={14} /> Add Column
          </button>
        </div>

        <div className="border border-line rounded-lg overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated text-left text-xs text-fg-muted">
              <tr>
                <th className="font-medium p-2 border-b border-line border-r w-8 text-center">PK</th>
                <th className="font-medium p-2 border-b border-line border-r">Name</th>
                <th className="font-medium p-2 border-b border-line border-r">Type</th>
                <th className="font-medium p-2 border-b border-line border-r w-24 text-center">Nullable</th>
                <th className="font-medium p-2 border-b border-line border-r">Default</th>
                <th className="font-medium p-2 border-b border-line w-10"></th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col, i) => (
                <tr key={i} className="border-b border-line last:border-0 hover:bg-fg/5">
                  <td className="p-2 border-r border-line text-center">
                    <input 
                      type="checkbox" 
                      checked={col.isPrimaryKey} 
                      onChange={e => updateColumn(i, { isPrimaryKey: e.target.checked })}
                      className="accent-accent"
                    />
                  </td>
                  <td className="p-0 border-r border-line">
                    <input 
                      value={col.name}
                      onChange={e => updateColumn(i, { name: e.target.value })}
                      placeholder="column_name"
                      className="w-full h-full p-2 bg-transparent outline-none font-mono text-xs focus:bg-surface-elevated"
                    />
                  </td>
                  <td className="p-0 border-r border-line">
                    <input 
                      value={col.type}
                      onChange={e => updateColumn(i, { type: e.target.value })}
                      placeholder="VARCHAR(255)"
                      className="w-full h-full p-2 bg-transparent outline-none font-mono text-xs focus:bg-surface-elevated text-accent"
                    />
                  </td>
                  <td className="p-2 border-r border-line text-center">
                    <input 
                      type="checkbox" 
                      checked={col.nullable} 
                      onChange={e => updateColumn(i, { nullable: e.target.checked })}
                      className="accent-accent"
                    />
                  </td>
                  <td className="p-0 border-r border-line">
                    <input 
                      value={col.defaultValue ?? ''}
                      onChange={e => updateColumn(i, { defaultValue: e.target.value || null })}
                      placeholder="NULL"
                      className="w-full h-full p-2 bg-transparent outline-none font-mono text-xs focus:bg-surface-elevated text-fg-subtle"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => removeColumn(i)}
                      className="text-fg-subtle hover:text-danger rounded p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {columns.length === 0 && (
            <div className="p-8 text-center text-fg-subtle text-sm">
              No columns defined.
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExecute}
            disabled={loading || !tableName.trim() || columns.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg rounded font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} />
            {loading ? 'Executing...' : 'Create Table'}
          </button>
          
          <button
            onClick={handlePreview}
            disabled={!tableName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-line hover:bg-fg/5 text-fg rounded font-medium disabled:opacity-50"
          >
            <Copy size={16} />
            Copy SQL to Clipboard
          </button>
        </div>

        {preview && (
          <div className="mt-8">
            <label className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-2 block">SQL Preview (Copied)</label>
            <pre className="p-4 bg-surface-elevated border border-line rounded font-mono text-xs text-accent overflow-auto">
              {preview}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
