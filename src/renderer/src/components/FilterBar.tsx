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
        <div className="px-3 py-2 flex flex-wrap gap-2 items-center bg-surface-raised/20">
          {rules.map((rule, index) => (
            <div 
              key={rule.id} 
              className="flex items-center gap-1.5 bg-surface-elevated border border-line rounded-md px-1.5 py-1 shadow-sm transition-colors hover:border-line/80 focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/20" 
              onKeyDown={handleKeyDown}
            >
              {/* Toggle */}
              <button
                onClick={() => onToggle(rule.id)}
                className={`p-0.5 rounded ${rule.enabled ? 'text-accent' : 'text-fg-muted opacity-50'} hover:opacity-100 hover:bg-fg/5`}
                title={rule.enabled ? 'Disable rule' : 'Enable rule'}
              >
                {rule.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              </button>

              {index > 0 && <span className="text-[10px] font-semibold text-fg-subtle px-0.5">AND</span>}

              {/* Column select */}
              <select
                value={rule.column}
                onChange={(e) => onUpdate(rule.id, { column: e.target.value })}
                className="bg-transparent text-fg text-[11px] outline-none max-w-[120px] font-medium"
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
                className="bg-transparent text-accent text-[11px] font-medium outline-none min-w-[30px]"
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
                  className="bg-transparent text-fg text-[11px] min-w-[80px] w-full max-w-[150px] outline-none placeholder:text-fg-subtle/50"
                />
              )}

              {/* Remove button */}
              <button
                onClick={() => onRemove(rule.id)}
                className="p-0.5 rounded text-fg-muted hover:text-danger hover:bg-danger/10 ml-0.5"
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
