import { PanelLeftClose, PanelLeftOpen, Sun, Moon } from 'lucide-react'
import { useUi } from '../store/ui'

export function TitleBar({ subtitle }: { subtitle?: string }) {
  const theme = useUi((s) => s.theme)
  const sidebarOpen = useUi((s) => s.sidebarOpen)
  const toggleSidebar = useUi((s) => s.toggleSidebar)
  const toggleTheme = useUi((s) => s.toggleTheme)

  return (
    <div className="drag h-10 flex items-center justify-between border-b border-line/70 bg-surface select-none">
      <div className="no-drag flex items-center pl-20">
        <IconButton
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Hide sidebar (⌘B)' : 'Show sidebar (⌘B)'}
        >
          {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </IconButton>
      </div>

      <div className="text-xs text-fg-muted">
        <span className="font-medium text-fg">Veexa</span>
        {subtitle && <span className="ml-2 text-fg-subtle">— {subtitle}</span>}
      </div>

      <div className="no-drag flex items-center pr-2">
        <IconButton onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </IconButton>
      </div>
    </div>
  )
}

function IconButton({
  onClick,
  title,
  children
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-fg/5 transition-colors"
    >
      {children}
    </button>
  )
}
