import { useState } from 'react'
import { Filter, Plus, X, ToggleLeft, ToggleRight, Play } from 'lucide-react'
import type { FilterOperator, FilterRule } from '@shared/types'

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'LIKE', label: 'LIKE' },
  { value: 'NOT LIKE', label: 'NOT LIKE' },
  { value: 'IS NULL', label: 'IS NULL' },
  { value: 'IS NOT NULL', label: 'IS NOT NULL' },
  { value: 'IN', label: 'IN' }
]

const NO_VALUE_OPS: FilterOperator[] = ['IS NULL', 'IS NOT NULL']

interface FilterBarProps {
  columns: string[]
  rules: FilterRule[]
  onAdd: () => void
  onUpdate: (ruleId: string, patch: Partial<FilterRule>) => void
  onRemove: (ruleId: string) => void
  onToggle: (ruleId: string) => void
  onApply: () => void
}

export function FilterBar({
  columns,
  rules,
  onAdd,
  onUpdate,
  onRemove,
  onToggle,
  onApply
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)
  const activeCount = rules.filter((r) => r.enabled).length

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onApply()
    }
  }

  if (!expanded && rules.length === 0) {
    return (
      <div className="flex items-center px-3 py-1 border-b border-line/70 text-[11px]">
        <button
          onClick={() => {
            setExpanded(true)
            onAdd()
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-fg-muted hover:text-accent hover:bg-fg/5"
        >
          <Filter size={11} />
          Add Filter
        </button>
      </div>
    )
  }

  return (
    <div className="border-b border-line/70 text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-surface-raised/50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-fg-muted hover:text-fg"
        >
          <Filter size={11} className={activeCount > 0 ? 'text-accent' : ''} />
          <span>
            Filters
            {activeCount > 0 && (
              <span className="ml-1 text-accent font-medium">({activeCount} active)</span>
            )}
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onAdd}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-fg-muted hover:text-accent hover:bg-fg/5"
            title="Add filter rule"
          >
            <Plus size={11} />
            Add
          </button>
          <button
            onClick={onApply}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 text-accent hover:bg-accent/25 font-medium"
            title="Apply filters"
          >
            <Play size={9} />
            Apply
          </button>
        </div>
      </div>

      {/* Rules */}
      {expanded !== false && rules.length > 0 && (
        <div className="px-3 py-1.5 space-y-1">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-1.5" onKeyDown={handleKeyDown}>
              {/* Toggle */}
              <button
                onClick={() => onToggle(rule.id)}
                className={`p-0.5 rounded ${rule.enabled ? 'text-accent' : 'text-fg-muted opacity-50'} hover:opacity-100`}
                title={rule.enabled ? 'Disable rule' : 'Enable rule'}
              >
                {rule.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              </button>

              {/* Column select */}
              <select
                value={rule.column}
                onChange={(e) => onUpdate(rule.id, { column: e.target.value })}
                className="bg-surface-elevated border border-line rounded px-1.5 py-0.5 text-fg text-[11px] min-w-[100px] max-w-[160px] outline-none focus:border-accent/60"
              >
                <option value="">Column…</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              {/* Operator select */}
              <select
                value={rule.operator}
                onChange={(e) => onUpdate(rule.id, { operator: e.target.value as FilterOperator })}
                className="bg-surface-elevated border border-line rounded px-1.5 py-0.5 text-fg text-[11px] min-w-[70px] outline-none focus:border-accent/60"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Value input (hidden for IS NULL / IS NOT NULL) */}
              {!NO_VALUE_OPS.includes(rule.operator) && (
                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => onUpdate(rule.id, { value: e.target.value })}
                  placeholder={rule.operator === 'IN' ? 'val1, val2, …' : 'value'}
                  className="bg-surface-elevated border border-line rounded px-1.5 py-0.5 text-fg text-[11px] min-w-[120px] flex-1 max-w-[240px] outline-none focus:border-accent/60 placeholder:text-fg-subtle/50"
                />
              )}

              {/* Remove button */}
              <button
                onClick={() => onRemove(rule.id)}
                className="p-0.5 rounded text-fg-muted hover:text-danger"
                title="Remove rule"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
