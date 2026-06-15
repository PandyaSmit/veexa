import { useEffect } from 'react'
import { TabBar } from '../../components/TabBar'
import { StartScreen } from '../../components/StartScreen'
import { QueryTabView } from '../tabs/QueryTabView'
import { TableTabView } from '../tabs/TableTabView'
import { useConnections } from '../../store/connections'
import { useTabs } from '../../store/tabs'

export function Workspace() {
  const active = useConnections((s) => s.items.find((i) => i.id === s.activeId)) ?? null
  const tabs = useTabs((s) => s.tabs)
  const activeId = useTabs((s) => s.activeId)

  const visibleTabs = active ? tabs.filter((t) => t.connectionId === active.id) : []
  const current = visibleTabs.find((t) => t.id === activeId) ?? null

  useEffect(() => {
    if (!active) return
    const state = useTabs.getState()
    const visible = state.tabs.filter((t) => t.connectionId === active.id)
    if (visible.length === 0) {
      state.openQueryTab(active.id)
    } else if (!visible.find((t) => t.id === state.activeId)) {
      state.setActive(visible[0].id)
    }
  }, [active?.id])

  if (!active) return <StartScreen />

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TabBar
        connectionId={active.id}
        onNewQuery={() => useTabs.getState().openQueryTab(active.id)}
      />
      <div className="flex-1 min-h-0">
        {current?.kind === 'query' && <QueryTabView tab={current} />}
        {current?.kind === 'table' && <TableTabView tab={current} />}
      </div>
    </div>
  )
}
