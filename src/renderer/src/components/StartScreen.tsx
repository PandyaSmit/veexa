import { Database, Plus } from 'lucide-react'
import { useConnections } from '../store/connections'
import { useUi } from '../store/ui'

export function StartScreen() {
  const items = useConnections((s) => s.items)
  const setActive = useConnections((s) => s.setActive)
  const openNew = useUi((s) => s.openNewConnection)

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto bg-surface">
      <div className="w-[640px] max-w-full px-8 py-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-md bg-accent text-accent-fg flex items-center justify-center">
            <Database size={18} strokeWidth={2.5} />
          </div>
          <div className="text-2xl font-semibold text-fg">Veexa</div>
        </div>
        <div className="text-sm text-fg-muted mb-8 ml-10">
          Connect to a database to get started.
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {items.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className="text-left p-4 rounded-lg border border-line bg-surface-raised hover:border-accent transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Database size={14} className="text-accent" />
                <div className="text-sm text-fg truncate">{c.name}</div>
              </div>
              <div className="text-[11px] text-fg-subtle mt-1 truncate ml-6">
                {c.driver} · {c.host}/{c.database}
              </div>
            </button>
          ))}
          <button
            onClick={openNew}
            className="flex items-center gap-2 p-4 rounded-lg border border-dashed border-line text-sm text-fg-muted hover:text-fg hover:border-accent"
          >
            <Plus size={14} className="text-accent" />
            New connection
          </button>
        </div>

        <div className="text-[11px] text-fg-subtle">
          Tip: press{' '}
          <kbd className="px-1.5 py-0.5 rounded border border-line bg-surface-elevated text-fg-muted">
            ⌘K
          </kbd>{' '}
          to open the command palette.
        </div>
      </div>
    </div>
  )
}
