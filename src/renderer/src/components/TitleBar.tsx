import { useEffect, useState } from 'react'
import { Minus, Square, X, PanelLeftClose, PanelLeftOpen, Sun, Moon } from 'lucide-react'
import { useUi } from '../store/ui'

export function TitleBar({ subtitle }: { subtitle?: string }) {
  const theme = useUi((s) => s.theme)
  const sidebarOpen = useUi((s) => s.sidebarOpen)
  const toggleSidebar = useUi((s) => s.toggleSidebar)
  const toggleTheme = useUi((s) => s.toggleTheme)
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('darwin')

  useEffect(() => {
    window.api.platform().then((info) => setPlatform(info.platform))
  }, [])

  const isMac = platform === 'darwin'

  return (
    <div className="drag h-10 flex items-center justify-between border-b border-line/70 bg-surface select-none">
      {/* Left side: traffic-light space on Mac, sidebar toggle otherwise */}
      <div className={`no-drag flex items-center ${isMac ? 'pl-20' : 'pl-2'}`}>
        <IconButton
          onClick={toggleSidebar}
          title={sidebarOpen ? `Hide sidebar (${isMac ? '⌘' : 'Ctrl+'}B)` : `Show sidebar (${isMac ? '⌘' : 'Ctrl+'}B)`}
        >
          {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </IconButton>
      </div>

      {/* Center: app name */}
      <div className="text-xs text-fg-muted flex items-center">
        <div className="flex items-baseline">
          <span className="font-black tracking-[0.15em] text-fg leading-none" style={{ fontFamily: "'Montserrat', sans-serif" }}>VEEXA</span>
          <div className="w-1.5 h-1.5 bg-[#FFC107] ml-0.5"></div>
        </div>
        {subtitle && <span className="ml-2 text-fg-subtle">— {subtitle}</span>}
      </div>

      {/* Right side: theme toggle + window controls on Win/Linux */}
      <div className="no-drag flex items-center">
        <IconButton onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </IconButton>

        {!isMac && (
          <div className="flex items-center ml-1">
            <WindowButton onClick={() => window.api.window.minimize()} title="Minimize">
              <Minus size={14} />
            </WindowButton>
            <WindowButton onClick={() => window.api.window.maximize()} title="Maximize">
              <Square size={11} />
            </WindowButton>
            <WindowButton
              onClick={() => window.api.window.close()}
              title="Close"
              className="hover:bg-red-500 hover:text-white"
            >
              <X size={14} />
            </WindowButton>
          </div>
        )}

        {isMac && <div className="w-2" />}
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

function WindowButton({
  onClick,
  title,
  children,
  className = ''
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-11 h-10 flex items-center justify-center text-fg-muted hover:bg-fg/10 transition-colors ${className}`}
    >
      {children}
    </button>
  )
}
