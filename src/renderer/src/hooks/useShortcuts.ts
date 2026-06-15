import { useEffect } from 'react'

interface Handlers {
  onPalette: () => void
  onNewConnection: () => void
  onNewTab: () => void
  onCloseTab: () => void
  onToggleSidebar: () => void
  onToggleTheme: () => void
  onRun: () => void
  onExport: () => void
  onSave: () => void
}

export function useShortcuts(h: Handlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      const key = e.key.toLowerCase()
      if (key === 'k') {
        e.preventDefault()
        h.onPalette()
      } else if (key === 'n' && !e.shiftKey) {
        e.preventDefault()
        h.onNewConnection()
      } else if (key === 't') {
        e.preventDefault()
        h.onNewTab()
      } else if (key === 'w') {
        e.preventDefault()
        h.onCloseTab()
      } else if (key === 'b') {
        e.preventDefault()
        h.onToggleSidebar()
      } else if (e.shiftKey && key === 'l') {
        e.preventDefault()
        h.onToggleTheme()
      } else if (key === 's' && !e.shiftKey) {
        e.preventDefault()
        h.onSave()
      } else if (key === 'enter') {
        e.preventDefault()
        h.onRun()
      } else if (e.shiftKey && key === 'e') {
        e.preventDefault()
        h.onExport()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [h])
}
