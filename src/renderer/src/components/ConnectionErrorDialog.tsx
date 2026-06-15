import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useConnections } from '../store/connections'
import { useUi, type ConnectionError } from '../store/ui'

interface Props {
  error: ConnectionError
  onClose: () => void
  onRetry: () => void
}

export function ConnectionErrorDialog({ error, onClose, onRetry }: Props) {
  const connection = useConnections((s) => s.items.find((c) => c.id === error.connectionId))
  const openEdit = useUi((s) => s.openEditConnection)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-drag"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-w-[90vw] bg-surface-elevated border border-line rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-danger/15 text-danger flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-fg">Couldn't connect</div>
            <div className="text-xs text-fg-muted mt-0.5">
              {connection
                ? `to ${connection.name} (${connection.driver}://${connection.host}/${connection.database})`
                : 'to the saved connection'}
            </div>
          </div>
        </div>
        <div className="px-5 pb-4">
          <pre className="text-xs font-mono text-danger bg-surface-sunken/40 border border-line/60 rounded p-2 whitespace-pre-wrap max-h-40 overflow-auto">
            {error.message}
          </pre>
        </div>
        <div className="px-5 py-3 border-t border-line flex justify-between items-center">
          <button
            onClick={() => {
              onClose()
              openEdit(error.connectionId)
            }}
            className="text-xs text-fg-muted hover:text-fg"
          >
            Edit connection…
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-md border border-line text-fg-muted hover:text-fg hover:bg-fg/5"
            >
              Cancel
            </button>
            <button
              onClick={onRetry}
              className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-fg font-medium hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
