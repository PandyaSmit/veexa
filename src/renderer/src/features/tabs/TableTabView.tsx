import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Plus,
  RotateCw,
  Undo2,
  Upload,
  X
} from 'lucide-react'
import { EditableDataGrid } from '../../components/EditableDataGrid'
import { CellPeekModal } from '../../components/CellPeekModal'
import { MutationPreviewDialog } from '../../components/MutationPreviewDialog'
import { FilterBar } from '../../components/FilterBar'
import { useTabs, type TableTab } from '../../store/tabs'
import { useConnections } from '../../store/connections'
import { StructureView } from './StructureView'
import { exportRowsToCsv } from '../../lib/exportCsv'

interface Props {
  tab: TableTab
}

export function TableTabView({ tab }: Props) {
  const setView = useTabs((s) => s.setTableView)
  const setSort = useTabs((s) => s.setTableSort)
  const setPage = useTabs((s) => s.setTablePage)
  const reload = useTabs((s) => s.loadTableData)
  const clearFilter = useTabs((s) => s.clearTableFilter)
  const openTableTab = useTabs((s) => s.openTableTab)
  const editCell = useTabs((s) => s.editCell)
  const markDelete = useTabs((s) => s.markDelete)
  const unmarkDelete = useTabs((s) => s.unmarkDelete)
  const addInsert = useTabs((s) => s.addInsert)
  const updateInsert = useTabs((s) => s.updateInsert)
  const removeInsert = useTabs((s) => s.removeInsert)
  const discardPending = useTabs((s) => s.discardPending)
  const buildMutations = useTabs((s) => s.buildMutations)
  const commitPending = useTabs((s) => s.commitPending)
  const addFilterRule = useTabs((s) => s.addFilterRule)
  const updateFilterRule = useTabs((s) => s.updateFilterRule)
  const removeFilterRule = useTabs((s) => s.removeFilterRule)
  const toggleFilterRule = useTabs((s) => s.toggleFilterRule)
  const applyFilters = useTabs((s) => s.applyFilters)


  const connection = useConnections((s) => s.items.find((c) => c.id === tab.connectionId)) ?? null
  const readOnly = !!connection?.readOnly

  const [peek, setPeek] = useState<{ column: string; value: unknown } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewStatements, setPreviewStatements] = useState<string[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    if (!tab.data && !tab.loading) void reload(tab.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id])

  const fkColumns = useMemo(
    () => new Set(tab.foreignKeys.map((fk) => fk.column)),
    [tab.foreignKeys]
  )

  const pendingCount =
    Object.keys(tab.pendingEdits).length +
    tab.pendingDeletes.length +
    tab.pendingInserts.length
  const hasPending = pendingCount > 0

  const handleFkClick = (column: string, value: unknown) => {
    const fk = tab.foreignKeys.find((f) => f.column === column)
    if (!fk) return
    openTableTab(
      tab.connectionId,
      { schema: fk.referencedSchema, name: fk.referencedTable },
      { column: fk.referencedColumn, value }
    )
  }

  const openPreview = async () => {
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const mutations = buildMutations(tab.id)
      const statements = await window.api.session.previewMutations(tab.connectionId, mutations)
      setPreviewStatements(statements)
    } catch (err: any) {
      setPreviewError(err?.message ?? String(err))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCommit = async () => {
    try {
      await commitPending(tab.id)
      setPreviewOpen(false)
      setPreviewStatements(null)
    } catch (err: any) {
      setPreviewError(err?.message ?? String(err))
    }
  }

  const editingBlocked = readOnly
    ? 'Connection is read-only.'
    : tab.primaryKey
      ? null
      : 'Editing requires a single-column primary key.'

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-line/70 text-xs">
        <div className="flex items-center gap-1">
          <SubtabButton active={tab.view === 'data'} onClick={() => setView(tab.id, 'data')}>
            Data
          </SubtabButton>
          <SubtabButton
            active={tab.view === 'structure'}
            onClick={() => setView(tab.id, 'structure')}
          >
            Structure
          </SubtabButton>
        </div>
        <div className="flex items-center gap-2">
          {readOnly && (
            <span className="flex items-center gap-1 text-[11px] text-accent">
              <Lock size={11} />
              Read-only
            </span>
          )}
          {tab.filter && (
            <button
              onClick={() => clearFilter(tab.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[11px] border border-accent/40 hover:bg-accent/25"
              title="Clear filter"
            >
              {tab.filter.column} = {String(tab.filter.value)}
              <X size={10} />
            </button>
          )}
          <div className="text-fg-subtle">
            {tab.ref.schema}.<span className="text-fg">{tab.ref.name}</span>
          </div>
        </div>
      </div>

      {tab.view === 'data' ? (
        <>
          {hasPending && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-accent/10 border-b border-accent/40 text-[11px]">
              <div className="text-fg">
                <span className="font-medium text-accent">{pendingCount}</span> pending change
                {pendingCount > 1 ? 's' : ''}
                <span className="text-fg-subtle ml-2">
                  {Object.keys(tab.pendingEdits).length} edits · {tab.pendingDeletes.length}{' '}
                  deletes · {tab.pendingInserts.length} inserts
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => discardPending(tab.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-fg-muted hover:text-danger"
                >
                  <Undo2 size={11} />
                  Discard
                </button>
                <button
                  onClick={openPreview}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent text-accent-fg font-medium hover:opacity-90"
                >
                  Review & Commit
                </button>
              </div>
            </div>
          )}
          <FilterBar
            columns={tab.structure?.columns.map(c => c.name) ?? tab.data?.columns.map(c => c.name) ?? []}
            rules={tab.filterRules}
            onAdd={() => addFilterRule(tab.id)}
            onUpdate={(ruleId, patch) => updateFilterRule(tab.id, ruleId, patch)}
            onRemove={(ruleId) => removeFilterRule(tab.id, ruleId)}
            onToggle={(ruleId) => toggleFilterRule(tab.id, ruleId)}
            onApply={() => applyFilters(tab.id)}
          />
          <DataView
            tab={tab}
            readOnly={readOnly}
            fkColumns={fkColumns}
            editingBlocked={editingBlocked}
            onSort={(col) => setSort(tab.id, col)}
            onPage={(p) => setPage(tab.id, p)}
            onReload={() => reload(tab.id)}
            onFkClick={handleFkClick}
            onCellPeek={(column, value) => setPeek({ column, value })}
            onEditCell={(pkValue, column, value) => editCell(tab.id, pkValue, column, value)}
            onMarkDelete={(pkValue) => markDelete(tab.id, pkValue)}
            onUnmarkDelete={(pkValue) => unmarkDelete(tab.id, pkValue)}
            onAddInsert={() => addInsert(tab.id)}
            onUpdateInsert={(insertId, column, value) =>
              updateInsert(tab.id, insertId, column, value)
            }
            onRemoveInsert={(insertId) => removeInsert(tab.id, insertId)}
          />
        </>
      ) : (
        <StructureView tab={tab} />
      )}

      {peek && (
        <CellPeekModal column={peek.column} value={peek.value} onClose={() => setPeek(null)} />
      )}
      {previewOpen && (
        <MutationPreviewDialog
          statements={previewStatements}
          loading={previewLoading}
          error={previewError}
          onConfirm={handleCommit}
          onClose={() => {
            setPreviewOpen(false)
            setPreviewError(null)
          }}
        />
      )}
    </div>
  )
}

function SubtabButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs ${
        active
          ? 'bg-accent/15 text-fg border border-accent/40'
          : 'text-fg-muted hover:text-fg hover:bg-fg/5 border border-transparent'
      }`}
    >
      {children}
    </button>
  )
}

interface DataProps {
  tab: TableTab
  readOnly: boolean
  fkColumns: Set<string>
  editingBlocked: string | null
  onSort: (col: string) => void
  onPage: (page: number) => void
  onReload: () => void
  onFkClick: (column: string, value: unknown) => void
  onCellPeek: (column: string, value: unknown) => void
  onEditCell: (pkValue: unknown, column: string, value: unknown) => void
  onMarkDelete: (pkValue: unknown) => void
  onUnmarkDelete: (pkValue: unknown) => void
  onAddInsert: () => string
  onUpdateInsert: (insertId: string, column: string, value: unknown) => void
  onRemoveInsert: (insertId: string) => void
}

function DataView({
  tab,
  readOnly,
  fkColumns,
  editingBlocked,
  onSort,
  onPage,
  onReload,
  onFkClick,
  onCellPeek,
  onEditCell,
  onMarkDelete,
  onUnmarkDelete,
  onAddInsert,
  onUpdateInsert,
  onRemoveInsert
}: DataProps) {
  const data = tab.data
  const startRow = tab.page * tab.pageSize + 1
  const endRow = startRow + (data?.rows.length ?? 0) - 1
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const handleExport = () => {
    if (!data) return
    exportRowsToCsv(`${tab.ref.name}_page${tab.page + 1}`, data.columns, data.rows)
  }

  const handleImport = async () => {
    setImporting(true)
    setImportMsg(null)
    try {
      const result = await window.api.session.importCsv(tab.connectionId, tab.ref)
      if (result.imported) {
        setImportMsg(`Imported ${result.rowCount} rows`)
        onReload()
        setTimeout(() => setImportMsg(null), 3000)
      }
    } catch (err: any) {
      setImportMsg(`Error: ${err?.message ?? String(err)}`)
      setTimeout(() => setImportMsg(null), 5000)
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="flex-1 min-h-0">
        {tab.error ? (
          <div className="p-4 text-xs text-danger font-mono whitespace-pre-wrap">{tab.error}</div>
        ) : tab.loading && !data ? (
          <div className="p-4 text-xs text-fg-subtle">Loading…</div>
        ) : data ? (
          <EditableDataGrid
            data={data}
            primaryKey={tab.primaryKey}
            readOnly={readOnly}
            pendingEdits={tab.pendingEdits}
            pendingDeletes={tab.pendingDeletes}
            pendingInserts={tab.pendingInserts}
            fkColumns={fkColumns}
            sortColumn={tab.sortColumn}
            sortDir={tab.sortDir}
            onSort={onSort}
            onFkClick={onFkClick}
            onCellPeek={onCellPeek}
            onEditCell={onEditCell}
            onMarkDelete={onMarkDelete}
            onUnmarkDelete={onUnmarkDelete}
            onUpdateInsert={onUpdateInsert}
            onRemoveInsert={onRemoveInsert}
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-fg-muted border-t border-line/70 bg-surface-raised">
        <div className="flex items-center gap-3">
          <span>
            {data && data.rows.length > 0
              ? `rows ${startRow.toLocaleString()}–${endRow.toLocaleString()}${data.hasMore ? '' : ' (end)'} · ${data.durationMs} ms`
              : data
                ? 'No rows'
                : ''}
          </span>
          {editingBlocked && data && (
            <span className="text-fg-subtle italic">{editingBlocked}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!editingBlocked && (
            <button
              onClick={onAddInsert}
              className="flex items-center gap-1 px-2 py-0.5 text-fg-muted hover:text-accent"
              title="Add row"
            >
              <Plus size={11} />
              Add row
            </button>
          )}
          <PagerButton
            onClick={() => onPage(tab.page - 1)}
            disabled={tab.page === 0 || tab.loading}
          >
            <ChevronLeft size={12} />
          </PagerButton>
          <span className="px-1.5">Page {tab.page + 1}</span>
          <PagerButton
            onClick={() => onPage(tab.page + 1)}
            disabled={!data?.hasMore || tab.loading}
          >
            <ChevronRight size={12} />
          </PagerButton>
          <button
            onClick={onReload}
            disabled={tab.loading}
            className="ml-2 p-1 text-fg-muted hover:text-accent disabled:opacity-30"
            title="Reload"
          >
            <RotateCw size={12} />
          </button>
          {data && data.rows.length > 0 && (
            <button
              onClick={handleExport}
              className="ml-1 flex items-center gap-1 px-2 py-0.5 text-fg-muted hover:text-accent"
            >
              <Download size={11} />
              Export CSV
            </button>
          )}
          {!readOnly && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="ml-1 flex items-center gap-1 px-2 py-0.5 text-fg-muted hover:text-accent disabled:opacity-40"
              title="Import data from CSV file"
            >
              <Upload size={11} />
              {importing ? 'Importing…' : 'Import CSV'}
            </button>
          )}
          {importMsg && (
            <span
              className={`ml-2 text-[10px] ${
                importMsg.startsWith('Error') ? 'text-danger' : 'text-accent'
              }`}
            >
              {importMsg}
            </span>
          )}
        </div>
      </div>
    </>
  )
}

function PagerButton({
  onClick,
  disabled,
  children
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1 rounded border border-line text-fg-muted hover:text-accent hover:border-accent/60 disabled:opacity-30 disabled:hover:border-line disabled:hover:text-fg-muted"
    >
      {children}
    </button>
  )
}

