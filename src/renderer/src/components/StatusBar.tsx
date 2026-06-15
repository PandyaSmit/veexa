import { Lock, Plug } from 'lucide-react'
import type { ConnectionConfig } from '@shared/types'
import { useTabs } from '../store/tabs'

interface Props {
  connection: ConnectionConfig | null
}

export function StatusBar({ connection }: Props) {
  const activeId = useTabs((s) => s.activeId)
  const tab = useTabs((s) => s.tabs.find((t) => t.id === activeId)) ?? null

  let detail = ''
  if (tab) {
    if (tab.kind === 'query') {
      const r = tab.results[tab.activeResultIndex]?.result
      if (r) detail = `${r.rowCount} rows · ${r.durationMs} ms`
      else if (tab.running) detail = 'Running…'
    } else if (tab.data) {
      detail = `${tab.data.rows.length} rows · ${tab.data.durationMs} ms`
    } else if (tab.loading) {
      detail = 'Running…'
    }
  }

  return (
    <div className="h-6 px-3 flex items-center justify-between text-[11px] text-fg-muted border-t border-line/70 bg-surface-raised select-none">
      <div className="flex items-center gap-2 truncate">
        <Plug
          size={11}
          className={connection ? 'text-accent' : 'text-fg-subtle'}
          strokeWidth={2}
        />
        {connection ? (
          <>
            <span className="text-fg">{connection.name}</span>
            {connection.readOnly && (
              <span className="flex items-center gap-1 text-accent">
                <Lock size={10} /> RO
              </span>
            )}
            <span className="text-fg-subtle">·</span>
            <span className="truncate">
              {connection.driver}://{connection.host}/{connection.database}
            </span>
          </>
        ) : (
          <span>Not connected</span>
        )}
      </div>
      <div>{detail}</div>
    </div>
  )
}
