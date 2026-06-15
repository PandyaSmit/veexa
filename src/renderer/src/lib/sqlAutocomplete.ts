import * as monaco from 'monaco-editor'
import type { ColumnInfo } from '@shared/types'

let activeTables: { schema: string; table: string }[] = []
let activeColumns: ColumnInfo[] = []
let registered = false

export function setSchemaSuggestions(
  tables: { schema: string; table: string }[],
  columns: ColumnInfo[]
): void {
  activeTables = tables
  activeColumns = columns
}

export function registerSqlAutocomplete(): void {
  if (registered) return
  registered = true

  monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }

      const lineUpToCursor = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      })
      // "tableName." or "tableName.partial" → scope to that table's columns.
      const dotMatch = lineUpToCursor.match(/(\w+)\.(\w*)$/)
      const suggestions: monaco.languages.CompletionItem[] = []

      if (dotMatch) {
        const tableName = dotMatch[1].toLowerCase()
        for (const c of activeColumns) {
          if (c.table.toLowerCase() === tableName) {
            suggestions.push({
              label: c.column,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: c.column,
              range,
              detail: c.type,
              sortText: `0_${c.column}`
            })
          }
        }
      } else {
        for (const t of activeTables) {
          suggestions.push({
            label: t.table,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: t.table,
            range,
            detail: t.schema,
            sortText: `1_${t.table}`
          })
        }
        // Deduplicate column names across tables for "anywhere" completion.
        const seen = new Set<string>()
        for (const c of activeColumns) {
          if (seen.has(c.column)) continue
          seen.add(c.column)
          suggestions.push({
            label: c.column,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: c.column,
            range,
            detail: `${c.schema}.${c.table}`,
            sortText: `2_${c.column}`
          })
        }
      }
      return { suggestions }
    }
  })
}
