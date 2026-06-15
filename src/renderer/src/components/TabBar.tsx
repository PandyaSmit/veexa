import { useMemo } from 'react'
import { FileCode2, Plus, Table2, X } from 'lucide-react'
import { useTabs, type Tab } from '../store/tabs'

interface Props {
  connectionId: string
  onNewQuery: () => void
}

export function TabBar({ connectionId, onNewQuery }: Props) {
  const allTabs = useTabs((s) => s.tabs)
  const tabs = useMemo(
    () => allTabs.filter((t) => t.connectionId === connectionId),
    [allTabs, connectionId]
  )
  const activeId = useTabs((s) => s.activeId)
  const setActive = useTabs((s) => s.setActive)
  const closeTab = useTabs((s) => s.closeTab)

  return (
    <div className="flex items-center bg-surface-raised border-b border-line/70 select-none">
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((t) => (
          <TabChip
            key={t.id}
            tab={t}
            active={t.id === activeId}
            onClick={() => setActive(t.id)}
            onClose={() => closeTab(t.id)}
          />
        ))}
      </div>
      <button
        onClick={onNewQuery}
        className="px-2.5 py-2 text-fg-muted hover:text-accent shrink-0"
        title="New query (⌘T)"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

function TabChip({
  tab,
  active,
  onClick,
  onClose
}: {
  tab: Tab
  active: boolean
  onClick: () => void
  onClose: () => void
}) {
  const Icon = tab.kind === 'query' ? FileCode2 : Table2
  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-3 py-1.5 border-r border-line/70 text-xs cursor-pointer max-w-[220px] ${
        active ? 'bg-surface text-fg' : 'text-fg-muted hover:text-fg hover:bg-fg/[0.03]'
      }`}
    >
      {active && <span className="absolute left-0 right-0 top-0 h-[2px] bg-accent" />}
      <Icon size={12} className={active ? 'text-accent shrink-0' : 'text-fg-subtle shrink-0'} />
      <span className="truncate">{tab.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="ml-1 opacity-0 group-hover:opacity-100 text-fg-subtle hover:text-fg p-0.5 rounded"
      >
        <X size={11} />
      </button>
    </div>
  )
}
