import { useEffect } from 'react'

interface Props {
  value: unknown
  column: string
  onClose: () => void
}

export function CellPeekModal({ value, column, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isNull = value === null || value === undefined
  let display: string
  let pretty = false
  if (isNull) {
    display = 'NULL'
  } else if (typeof value === 'object') {
    try {
      display = JSON.stringify(value, null, 2)
      pretty = true
    } catch {
      display = String(value)
    }
  } else {
    const s = String(value)
    // Try to pretty-print JSON strings.
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try {
        display = JSON.stringify(JSON.parse(s), null, 2)
        pretty = true
      } catch {
        display = s
      }
    } else {
      display = s
    }
  }

  const copy = () => navigator.clipboard.writeText(display).catch(() => {})

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-drag"
      onClick={onClose}
    >
      <div
        className="w-[640px] max-w-[90vw] max-h-[80vh] bg-surface-elevated border border-line rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <div className="text-sm">
            <span className="text-fg-subtle">Cell · </span>
            <span className="text-fg font-medium">{column}</span>
          </div>
          <button onClick={copy} className="text-[11px] text-fg-muted hover:text-accent">
            Copy
          </button>
        </div>
        <pre
          className={`flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap break-words ${
            isNull ? 'text-fg-subtle italic' : 'text-fg'
          }`}
        >
          {display}
        </pre>
        {pretty && (
          <div className="px-4 py-1.5 text-[10px] text-fg-subtle border-t border-line">
            JSON · pretty-printed
          </div>
        )}
      </div>
    </div>
  )
}
