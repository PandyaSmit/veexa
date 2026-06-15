import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Trash2, Undo2, X } from 'lucide-react'
import type { TablePage } from '@shared/types'
import type { PendingInsert } from '../store/tabs'

interface Props {
  data: TablePage
  primaryKey: string | null
  readOnly: boolean
  pendingEdits: Record<string, Record<string, unknown>>
  pendingDeletes: string[]
  pendingInserts: PendingInsert[]
  fkColumns?: Set<string>
  sortColumn?: string | null
  sortDir?: 'asc' | 'desc'
  onSort?: (column: string) => void
  onFkClick?: (column: string, value: unknown) => void
  onCellPeek?: (column: string, value: unknown) => void
  onEditCell?: (pkValue: unknown, column: string, value: unknown) => void
  onMarkDelete?: (pkValue: unknown) => void
  onUnmarkDelete?: (pkValue: unknown) => void
  onUpdateInsert?: (insertId: string, column: string, value: unknown) => void
  onRemoveInsert?: (insertId: string) => void
}

interface EditingCell {
  rowKey: string
  column: string
}

const ACTION_COL_WIDTH = 32
const COL_WIDTH = 180

export function EditableDataGrid({
  data,
  primaryKey,
  readOnly,
  pendingEdits,
  pendingDeletes,
  pendingInserts,
  fkColumns,
  sortColumn,
  sortDir,
  onSort,
  onFkClick,
  onCellPeek,
  onEditCell,
  onMarkDelete,
  onUnmarkDelete,
  onUpdateInsert,
  onRemoveInsert
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const editable = !readOnly && !!primaryKey

  const pkIndex = primaryKey ? data.columns.indexOf(primaryKey) : -1
  const totalRows = data.rows.length + pendingInserts.length
  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 12
  })

  const widths = useMemo(() => data.columns.map(() => COL_WIDTH), [data.columns.length])
  const totalWidth = ACTION_COL_WIDTH + widths.reduce((a, b) => a + b, 0)

  const startEdit = (rowKey: string, column: string) => {
    if (!editable) return
    setEditing({ rowKey, column })
  }
  const stopEdit = () => setEditing(null)

  // Click outside to commit edit
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopEdit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing])

  return (
    <div ref={parentRef} className="h-full overflow-auto font-mono text-xs bg-surface">
      <div style={{ width: totalWidth, position: 'relative' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface-elevated border-b border-line flex">
          <div style={{ width: ACTION_COL_WIDTH }} className="border-r border-line/60" />
          {data.columns.map((c, i) => {
            const active = sortColumn === c
            const isFk = fkColumns?.has(c)
            const isPk = c === primaryKey
            return (
              <div
                key={i}
                style={{ width: widths[i] }}
                className={`px-2 py-1.5 truncate border-r border-line/60 ${
                  onSort ? 'cursor-pointer hover:bg-fg/5' : ''
                } ${active ? 'text-accent' : 'text-fg'}`}
                onClick={() => onSort?.(c)}
                title={c}
              >
                {isPk && <span className="text-accent mr-1">★</span>}
                {isFk && <span className="text-accent mr-1">⇢</span>}
                {c}
                {active && (
                  <span className="ml-1 text-accent">{sortDir === 'desc' ? '↓' : '↑'}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Rows */}
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((vr) => {
            const isInsertRow = vr.index >= data.rows.length
            if (isInsertRow) {
              const ins = pendingInserts[vr.index - data.rows.length]
              return (
                <InsertRow
                  key={vr.key}
                  insert={ins}
                  columns={data.columns}
                  widths={widths}
                  top={vr.start}
                  height={vr.size}
                  editing={
                    editing?.rowKey === ins.id ? editing.column : null
                  }
                  onStartEdit={(col) => setEditing({ rowKey: ins.id, column: col })}
                  onCommit={(col, val) => {
                    onUpdateInsert?.(ins.id, col, val)
                    stopEdit()
                  }}
                  onCancel={stopEdit}
                  onRemove={() => onRemoveInsert?.(ins.id)}
                />
              )
            }

            const row = data.rows[vr.index]
            const pkValue = pkIndex >= 0 ? row[pkIndex] : null
            const pkKey = pkValue !== null && pkValue !== undefined ? String(pkValue) : null
            const isDeleted = pkKey ? pendingDeletes.includes(pkKey) : false
            const edits = pkKey ? pendingEdits[pkKey] : undefined

            return (
              <div
                key={vr.key}
                className={`flex border-b border-line/40 ${
                  isDeleted ? 'opacity-60 line-through' : 'hover:bg-fg/[0.03]'
                }`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateY(${vr.start}px)`,
                  height: vr.size
                }}
              >
                <div
                  style={{ width: ACTION_COL_WIDTH }}
                  className="flex items-center justify-center border-r border-line/40 group/action"
                >
                  {editable && pkKey ? (
                    isDeleted ? (
                      <button
                        onClick={() => onUnmarkDelete?.(pkValue)}
                        className="p-1 text-fg-subtle hover:text-accent"
                        title="Undo delete"
                      >
                        <Undo2 size={11} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onMarkDelete?.(pkValue)}
                        className="p-1 text-fg-subtle opacity-0 group-hover/action:opacity-100 hover:!opacity-100 hover:text-danger"
                        title="Delete row"
                      >
                        <Trash2 size={11} />
                      </button>
                    )
                  ) : null}
                </div>
                {data.columns.map((col, i) => {
                  const original = row[i]
                  const hasEdit = !!edits && col in edits
                  const value = hasEdit ? edits![col] : original
                  const isNull = value === null || value === undefined
                  const isFk = !isNull && fkColumns?.has(col)
                  const isEditingThisCell =
                    editing && pkKey && editing.rowKey === pkKey && editing.column === col

                  if (isEditingThisCell && pkValue !== undefined && pkValue !== null) {
                    return (
                      <CellInput
                        key={i}
                        width={widths[i]}
                        initial={value}
                        onCommit={(v) => {
                          onEditCell?.(pkValue, col, v)
                          stopEdit()
                        }}
                        onCancel={stopEdit}
                      />
                    )
                  }

                  return (
                    <div
                      key={i}
                      style={{ width: widths[i] }}
                      onClick={(e) => {
                        if (isFk && onFkClick) {
                          e.stopPropagation()
                          onFkClick(col, original)
                        } else {
                          onCellPeek?.(col, value)
                        }
                      }}
                      onDoubleClick={(e) => {
                        if (!editable || !pkKey || isDeleted) return
                        e.stopPropagation()
                        startEdit(pkKey, col)
                      }}
                      className={`px-2 py-1 truncate border-r border-line/40 cursor-pointer ${
                        hasEdit
                          ? 'bg-accent/15 text-fg'
                          : isNull
                            ? 'text-fg-subtle italic'
                            : isFk
                              ? 'text-accent underline decoration-dotted underline-offset-2'
                              : 'text-fg'
                      }`}
                      title={editable && pkKey && !isDeleted ? 'Double-click to edit' : undefined}
                    >
                      {formatCell(value)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function InsertRow({
  insert,
  columns,
  widths,
  top,
  height,
  editing,
  onStartEdit,
  onCommit,
  onCancel,
  onRemove
}: {
  insert: PendingInsert
  columns: string[]
  widths: number[]
  top: number
  height: number
  editing: string | null
  onStartEdit: (column: string) => void
  onCommit: (column: string, value: unknown) => void
  onCancel: () => void
  onRemove: () => void
}) {
  return (
    <div
      className="flex border-b border-accent/30 bg-accent/[0.05]"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translateY(${top}px)`,
        height
      }}
    >
      <div
        style={{ width: ACTION_COL_WIDTH }}
        className="flex items-center justify-center border-r border-line/40"
      >
        <button
          onClick={onRemove}
          className="p-1 text-fg-subtle hover:text-danger"
          title="Remove draft row"
        >
          <X size={11} />
        </button>
      </div>
      {columns.map((col, i) => {
        const value = insert.values[col]
        const isEditing = editing === col
        if (isEditing) {
          return (
            <CellInput
              key={i}
              width={widths[i]}
              initial={value}
              onCommit={(v) => onCommit(col, v)}
              onCancel={onCancel}
            />
          )
        }
        const isNull = value === undefined || value === null
        return (
          <div
            key={i}
            style={{ width: widths[i] }}
            onClick={() => onStartEdit(col)}
            className={`px-2 py-1 truncate border-r border-line/40 cursor-text ${
              isNull ? 'text-fg-subtle italic' : 'text-fg'
            }`}
          >
            {isNull ? 'DEFAULT' : formatCell(value)}
          </div>
        )
      })}
    </div>
  )
}

function CellInput({
  width,
  initial,
  onCommit,
  onCancel
}: {
  width: number
  initial: unknown
  onCommit: (v: unknown) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(
    initial === null || initial === undefined ? '' : String(initial)
  )
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const commit = () => {
    // Treat empty string as NULL; otherwise pass through as string.
    onCommit(value === '' ? null : value)
  }

  return (
    <div
      style={{ width }}
      className="border-r border-line/40 bg-surface-elevated"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') onCancel()
        }}
        className="w-full h-full px-2 py-1 bg-transparent text-fg outline-none border border-accent/60 font-mono text-xs"
      />
    </div>
  )
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}
