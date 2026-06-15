import { Database, Plus } from 'lucide-react'
import { useConnections } from '../store/connections'
import { useUi } from '../store/ui'
import { modKey } from '../lib/platform'

export function StartScreen() {
  const items = useConnections((s) => s.items)
  const setActive = useConnections((s) => s.setActive)
  const openNew = useUi((s) => s.openNewConnection)

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto bg-surface">
      <div className="w-[640px] max-w-full px-8 py-10">
        <div className="flex items-baseline mb-4 mt-2">
          <div className="text-[2.75rem] font-black tracking-[0.15em] text-fg leading-none" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            VEEXA
          </div>
          <div className="w-3 h-3 bg-[#FFC107] ml-2"></div>
        </div>
        <div className="text-sm text-fg-muted mb-8">
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

        <div className="text-[11px] text-fg-subtle mt-10">
          Tip: press{' '}
          <kbd className="px-1.5 py-0.5 rounded border border-line bg-surface-elevated text-fg-muted font-sans">
            {modKey()}K
          </kbd>{' '}
          to open the command palette.
        </div>
      </div>
    </div>
  )
}
