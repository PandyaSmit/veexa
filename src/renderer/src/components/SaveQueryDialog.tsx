import { useEffect, useState } from 'react'

interface Props {
  initialName: string
  onSave: (name: string) => void
  onClose: () => void
}

export function SaveQueryDialog({ initialName, onSave, onClose }: Props) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-drag"
      onClick={onClose}
    >
      <div
        className="w-[420px] bg-surface-elevated border border-line rounded-xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold mb-3">Save query</div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Name…"
          className="w-full bg-surface border border-line rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md border border-line text-fg-muted hover:text-fg hover:bg-fg/5"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-fg font-medium hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
