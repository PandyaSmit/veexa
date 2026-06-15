import { useEffect, useState } from 'react'

interface Props {
  statements: string[] | null
  loading: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function MutationPreviewDialog({ statements, loading, error, onConfirm, onClose }: Props) {
  const [committing, setCommitting] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const commit = async () => {
    setCommitting(true)
    try {
      await onConfirm()
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-drag"
      onClick={onClose}
    >
      <div
        className="w-[640px] max-w-[90vw] max-h-[80vh] bg-surface-elevated border border-line rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-line">
          <div className="text-sm font-semibold text-fg">Review changes</div>
          <div className="text-[11px] text-fg-subtle mt-0.5">
            The following statements will run in a single transaction.
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
          {loading && <div className="text-fg-subtle">Building preview…</div>}
          {!loading && error && (
            <div className="text-danger whitespace-pre-wrap">{error}</div>
          )}
          {!loading && !error && statements && statements.length === 0 && (
            <div className="text-fg-subtle">No changes to commit.</div>
          )}
          {!loading &&
            !error &&
            statements?.map((s, i) => (
              <div key={i} className="mb-3">
                <div className="text-[10px] text-fg-subtle mb-0.5">Statement {i + 1}</div>
                <pre className="whitespace-pre-wrap text-fg bg-surface-sunken/40 border border-line/60 rounded p-2">
                  {s};
                </pre>
              </div>
            ))}
        </div>
        <div className="px-4 py-3 border-t border-line flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md border border-line text-fg-muted hover:text-fg hover:bg-fg/5"
          >
            Cancel
          </button>
          <button
            onClick={commit}
            disabled={loading || committing || !statements || statements.length === 0 || !!error}
            className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-fg font-medium hover:opacity-90 disabled:opacity-40"
          >
            {committing ? 'Committing…' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  )
}
