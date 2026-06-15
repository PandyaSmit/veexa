import { useEffect, useState } from 'react'
import { Bookmark, Download, Play, Square } from 'lucide-react'
import { QueryEditor } from '../../components/QueryEditor'
import { ResultsTable } from '../../components/ResultsTable'
import { CellPeekModal } from '../../components/CellPeekModal'
import { SaveQueryDialog } from '../../components/SaveQueryDialog'
import { useTabs, type QueryTab } from '../../store/tabs'
import { useSavedQueries } from '../../store/savedQueries'
import { exportRowsToCsv } from '../../lib/exportCsv'
import { modKey } from '../../lib/platform'

interface Props {
  tab: QueryTab
}

export function QueryTabView({ tab }: Props) {
  const setSql = useTabs((s) => s.setSql)
  const runQuery = useTabs((s) => s.runQuery)
  const cancelQuery = useTabs((s) => s.cancelQuery)
  const setActiveResult = useTabs((s) => s.setActiveResult)
  const upsertSaved = useSavedQueries((s) => s.upsert)
  const savedItems = useSavedQueries((s) => s.items)

  const [peek, setPeek] = useState<{ column: string; value: unknown } | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)

  useEffect(() => {
    const onSave = () => setSaveOpen(true)
    window.addEventListener('veexa:save-query', onSave)
    return () => window.removeEventListener('veexa:save-query', onSave)
  }, [])

  const activeSet = tab.results[tab.activeResultIndex] ?? null
  const result = activeSet?.result ?? null
  const error = activeSet?.error ?? null
  const existing = tab.savedQueryId ? savedItems.find((q) => q.id === tab.savedQueryId) : null

  const handleExport = () => {
    if (!result) return
    exportRowsToCsv(`query_${Date.now()}`, result.columns, result.rows)
  }

  const handleSave = async (name: string) => {
    setSaveOpen(false)
    await upsertSaved({
      id: tab.savedQueryId ?? crypto.randomUUID(),
      name,
      connectionId: tab.connectionId,
      sql: tab.sql,
      createdAt: Date.now()
    })
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-line/70 text-xs">
        <span className="text-fg-muted">Query</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSaveOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-fg-muted hover:text-accent hover:bg-fg/5"
            title={`Save query (${modKey()}S)`}
          >
            <Bookmark size={11} />
            Save
          </button>
          {tab.running ? (
            <button
              onClick={() => cancelQuery(tab.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-danger text-white text-xs font-medium hover:opacity-90"
              title="Cancel running query"
            >
              <Square size={10} fill="currentColor" />
              Cancel
            </button>
          ) : (
            <button
              onClick={() => runQuery(tab.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent text-accent-fg text-xs font-medium hover:opacity-90"
              title={`${modKey()}↩`}
            >
              <Play size={11} fill="currentColor" />
              Run
              <span className="text-accent-fg/60 text-[10px] ml-0.5 font-sans">{modKey()}↩</span>
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <QueryEditor
          value={tab.sql}
          onChange={(v) => setSql(tab.id, v)}
          onRun={() => runQuery(tab.id)}
        />
      </div>
      <div className="h-[45%] min-h-[160px] flex flex-col border-t border-line/70 bg-surface">
        {tab.results.length > 1 && (
          <div className="flex bg-surface-raised border-b border-line/70">
            {tab.results.map((r, i) => (
              <button
                key={i}
                onClick={() => setActiveResult(tab.id, i)}
                className={`px-3 py-1 text-[11px] border-r border-line/70 ${
                  i === tab.activeResultIndex
                    ? 'bg-surface text-fg border-t-2 border-t-accent -mt-px'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                Result {i + 1}
                {r.error ? (
                  <span className="text-danger ml-1">!</span>
                ) : r.result ? (
                  <span className="text-fg-subtle ml-1">· {r.result.rowCount}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
        <div className="px-3 py-1.5 text-[11px] text-fg-muted border-b border-line/70 flex justify-between items-center">
          <span>
            {error
              ? 'Error'
              : result
                ? `${result.rowCount} rows · ${result.durationMs} ms`
                : tab.running
                  ? 'Running…'
                  : 'No results'}
          </span>
          <div className="flex items-center gap-3">
            {existing && (
              <span className="text-[11px] text-fg-subtle">Saved · {existing.name}</span>
            )}
            {result && result.rows.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1 text-[11px] text-fg-muted hover:text-accent"
              >
                <Download size={11} />
                Export CSV
              </button>
            )}
          </div>
        </div>
        {error ? (
          <div className="p-4 text-xs text-danger font-mono whitespace-pre-wrap">{error}</div>
        ) : result ? (
          <div className="flex-1 min-h-0">
            <ResultsTable
              columns={result.columns}
              rows={result.rows}
              onCellPeek={(column, value) => setPeek({ column, value })}
            />
          </div>
        ) : null}
      </div>

      {peek && (
        <CellPeekModal column={peek.column} value={peek.value} onClose={() => setPeek(null)} />
      )}
      {saveOpen && (
        <SaveQueryDialog
          initialName={existing?.name ?? 'Untitled query'}
          onSave={handleSave}
          onClose={() => setSaveOpen(false)}
        />
      )}
    </div>
  )
}
