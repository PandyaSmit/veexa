import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { TableTab } from '../../store/tabs'
import { useTabs } from '../../store/tabs'
import { useConnections } from '../../store/connections'
import { StructureEditor } from './StructureEditor'

interface Props {
  tab: TableTab
}

export function StructureView({ tab }: Props) {
  const [editing, setEditing] = useState(false)
  const connection = useConnections((s) => s.items.find((c) => c.id === tab.connectionId)) ?? null
  const readOnly = !!connection?.readOnly

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to completely delete table ${tab.ref.schema}.${tab.ref.name}? This cannot be undone.`)) {
      return
    }
    try {
      await window.api.session.dropTable(tab.connectionId, tab.ref)
      const closeTab = useTabs.getState().closeTab
      closeTab(tab.id)
      // refresh sidebar schema
      window.api.session.schema(tab.connectionId).catch(() => {})
      window.dispatchEvent(new CustomEvent('schema-changed'))
    } catch (err: any) {
      alert(`Error dropping table: ${err?.message ?? String(err)}`)
    }
  }

  if (editing) {
    return <StructureEditor tab={tab} onClose={() => setEditing(false)} />
  }

  const s = tab.structure
  return (
    <div className="flex-1 min-h-0 overflow-auto p-4 text-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium">Table Structure</h2>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-elevated border border-line text-fg hover:border-accent hover:text-accent transition-colors"
            >
              <Pencil size={13} />
              Edit Structure
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 size={13} />
              Drop Table
            </button>
          </div>
        )}
      </div>

      {tab.error && <div className="text-danger font-mono mb-3">{tab.error}</div>}
      {!s && !tab.error && <div className="text-fg-subtle">Loading structure…</div>}
      
      {s && (
        <>
          <div className="text-fg-muted mb-2 font-medium">Columns</div>
          <table className="w-full text-fg mb-6 border-collapse">
            <thead className="text-fg-subtle text-left">
              <tr>
                <th className="font-normal pb-1.5 pr-4 border-b border-line/60">Name</th>
                <th className="font-normal pb-1.5 pr-4 border-b border-line/60">Type</th>
                <th className="font-normal pb-1.5 pr-4 border-b border-line/60">Nullable</th>
                <th className="font-normal pb-1.5 pr-4 border-b border-line/60">Default</th>
                <th className="font-normal pb-1.5 border-b border-line/60">Key</th>
              </tr>
            </thead>
            <tbody>
              {s.columns.map((c) => (
                <tr key={c.name} className="border-b border-line/30 last:border-0 hover:bg-surface-raised/30">
                  <td className="py-2 pr-4 font-mono">{c.name}</td>
                  <td className="py-2 pr-4 font-mono text-fg-muted">{c.type}</td>
                  <td className="py-2 pr-4">{c.nullable ? 'YES' : 'NO'}</td>
                  <td className="py-2 pr-4 font-mono text-fg-subtle">{c.default ?? '—'}</td>
                  <td className="py-2">
                    {c.isPrimaryKey && (
                      <span className="text-accent font-medium text-[10px] bg-accent/10 px-1 py-0.5 rounded">PK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-fg-muted mb-2 font-medium">Indexes</div>
          {s.indexes.length === 0 ? (
            <div className="text-fg-subtle">No indexes</div>
          ) : (
            <table className="w-full text-fg border-collapse">
              <thead className="text-fg-subtle text-left">
                <tr>
                  <th className="font-normal pb-1.5 pr-4 border-b border-line/60">Name</th>
                  <th className="font-normal pb-1.5 pr-4 border-b border-line/60">Columns</th>
                  <th className="font-normal pb-1.5 pr-4 border-b border-line/60">Unique</th>
                  <th className="font-normal pb-1.5 border-b border-line/60">Primary</th>
                </tr>
              </thead>
              <tbody>
                {s.indexes.map((i) => (
                  <tr key={i.name} className="border-b border-line/30 last:border-0 hover:bg-surface-raised/30">
                    <td className="py-2 pr-4 font-mono">{i.name}</td>
                    <td className="py-2 pr-4 font-mono text-fg-muted">{i.columns.join(', ')}</td>
                    <td className="py-2 pr-4">{i.isUnique ? 'YES' : 'NO'}</td>
                    <td className="py-2">{i.isPrimary ? 'YES' : 'NO'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
