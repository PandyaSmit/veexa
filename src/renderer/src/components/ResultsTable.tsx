import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface Props {
  columns: string[]
  rows: unknown[][]
  sortColumn?: string | null
  sortDir?: 'asc' | 'desc'
  onSort?: (column: string) => void
  fkColumns?: Set<string>
  onFkClick?: (column: string, value: unknown) => void
  onCellPeek?: (column: string, value: unknown) => void
}

export function ResultsTable({
  columns,
  rows,
  sortColumn,
  sortDir,
  onSort,
  fkColumns,
  onFkClick,
  onCellPeek
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 12
  })

  const widths = useMemo(() => columns.map(() => 180), [columns.length])
  const totalWidth = widths.reduce((a, b) => a + b, 0)

  return (
    <div ref={parentRef} className="h-full overflow-auto font-mono text-xs bg-surface">
      <div style={{ width: totalWidth, position: 'relative' }}>
        <div className="sticky top-0 z-10 bg-surface-elevated border-b border-line flex">
          {columns.map((c, i) => {
            const active = sortColumn === c
            const isFk = fkColumns?.has(c)
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
                {isFk && <span className="text-accent mr-1">⇢</span>}
                {c}
                {active && (
                  <span className="ml-1 text-accent">{sortDir === 'desc' ? '↓' : '↑'}</span>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((vr) => {
            const row = rows[vr.index]
            return (
              <div
                key={vr.key}
                className="flex border-b border-line/40 hover:bg-fg/[0.03]"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateY(${vr.start}px)`,
                  height: vr.size
                }}
              >
                {columns.map((col, i) => {
                  const value = row?.[i]
                  const isNull = value === null || value === undefined
                  const isFk = !isNull && fkColumns?.has(col)
                  return (
                    <div
                      key={i}
                      style={{ width: widths[i] }}
                      onClick={(e) => {
                        if (isFk && onFkClick) {
                          e.stopPropagation()
                          onFkClick(col, value)
                        } else {
                          onCellPeek?.(col, value)
                        }
                      }}
                      className={`px-2 py-1 truncate border-r border-line/40 cursor-pointer ${
                        isNull
                          ? 'text-fg-subtle italic'
                          : isFk
                            ? 'text-accent underline decoration-dotted underline-offset-2'
                            : 'text-fg'
                      }`}
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
