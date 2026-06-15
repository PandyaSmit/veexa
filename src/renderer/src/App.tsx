import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { CommandPalette } from './components/CommandPalette'
import { ConnectionDialog } from './components/ConnectionDialog'
import { ConnectionErrorDialog } from './components/ConnectionErrorDialog'
import { StatusBar } from './components/StatusBar'
import { Workspace } from './features/workspace/Workspace'
import { useConnections } from './store/connections'
import { useUi } from './store/ui'
import { useTabs } from './store/tabs'
import { useShortcuts } from './hooks/useShortcuts'
import { exportRowsToCsv } from './lib/exportCsv'

export default function App() {
  const active = useConnections((s) => s.items.find((i) => i.id === s.activeId)) ?? null
  const palette = useUi((s) => s.palette)
  const togglePalette = useUi((s) => s.togglePalette)
  const editingConnection = useUi((s) => s.editingConnection)
  const openNew = useUi((s) => s.openNewConnection)
  const closeDialog = useUi((s) => s.closeConnectionDialog)
  const sidebarOpen = useUi((s) => s.sidebarOpen)
  const toggleSidebar = useUi((s) => s.toggleSidebar)
  const toggleTheme = useUi((s) => s.toggleTheme)
  const connectionError = useUi((s) => s.connectionError)
  const setConnectionError = useUi((s) => s.setConnectionError)
  const setActiveConn = useConnections((s) => s.setActive)
  const openQueryTab = useTabs((s) => s.openQueryTab)
  const closeTab = useTabs((s) => s.closeTab)
  const runQuery = useTabs((s) => s.runQuery)
  const activeTabId = useTabs((s) => s.activeId)
  const activeTab = useTabs((s) => s.tabs.find((t) => t.id === s.activeId)) ?? null

  useShortcuts({
    onPalette: () => togglePalette(),
    onNewConnection: openNew,
    onNewTab: () => active && openQueryTab(active.id),
    onCloseTab: () => activeTabId && closeTab(activeTabId),
    onToggleSidebar: toggleSidebar,
    onToggleTheme: toggleTheme,
    onRun: () => activeTab?.kind === 'query' && runQuery(activeTab.id),
    onSave: () => {
      if (activeTab?.kind === 'query') {
        window.dispatchEvent(new CustomEvent('veexa:save-query'))
      }
    },
    onExport: () => {
      if (activeTab?.kind === 'query') {
        const result = activeTab.results[activeTab.activeResultIndex]?.result
        if (result) exportRowsToCsv(`query_${Date.now()}`, result.columns, result.rows)
      } else if (activeTab?.kind === 'table' && activeTab.data) {
        exportRowsToCsv(
          `${activeTab.ref.name}_page${activeTab.page + 1}`,
          activeTab.data.columns,
          activeTab.data.rows
        )
      }
    }
  })

  return (
    <div className="h-full flex flex-col bg-surface text-fg">
      <TitleBar subtitle={active?.name} />
      <div className="flex-1 flex min-h-0">
        {sidebarOpen && <Sidebar />}
        <Workspace />
      </div>
      <StatusBar connection={active} />
      <CommandPalette
        open={palette}
        onClose={() => togglePalette(false)}
        onNewConnection={openNew}
      />
      {editingConnection !== undefined && (
        <ConnectionDialog editingId={editingConnection} onClose={closeDialog} />
      )}
      {connectionError && (
        <ConnectionErrorDialog
          error={connectionError}
          onClose={() => setConnectionError(null)}
          onRetry={() => {
            const id = connectionError.connectionId
            setConnectionError(null)
            // Re-trigger the open-on-active effect by toggling activeId.
            setActiveConn(null)
            setTimeout(() => setActiveConn(id), 0)
          }}
        />
      )}
    </div>
  )
}
