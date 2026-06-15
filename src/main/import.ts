import { dialog, BrowserWindow } from 'electron'
import { readFile } from 'node:fs/promises'
import type { CsvImportResult, TableRef } from '@shared/types'
import { getSession } from './database/sessions'

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

/**
 * Escape a SQL identifier (table name, column name, schema) with double quotes.
 */
function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

/**
 * Escape a SQL string literal with single quotes.
 */
function literal(value: string): string {
  if (value === '' || value.toLowerCase() === 'null') return 'NULL'
  return `'${value.replace(/'/g, "''")}'`
}

const BATCH_SIZE = 100

export async function importCsv(
  connectionId: string,
  ref: TableRef
): Promise<CsvImportResult> {
  const win = BrowserWindow.getFocusedWindow() ?? undefined
  const result = await dialog.showOpenDialog(win!, {
    title: 'Import CSV',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { imported: false, rowCount: 0 }
  }

  const filePath = result.filePaths[0]
  const content = await readFile(filePath, 'utf8')
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    return { imported: false, rowCount: 0 }
  }

  const headers = parseCsvLine(lines[0])
  const columnList = headers.map(ident).join(', ')
  const qualifiedTable = `${ident(ref.schema)}.${ident(ref.name)}`
  const session = getSession(connectionId)

  let totalInserted = 0

  // Process rows in batches
  for (let i = 1; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE)
    const valueRows = batch.map((line) => {
      const values = parseCsvLine(line)
      return `(${values.map(literal).join(', ')})`
    })

    const sql = `INSERT INTO ${qualifiedTable} (${columnList}) VALUES\n${valueRows.join(',\n')}`
    await session.query(sql)
    totalInserted += batch.length
  }

  return { imported: true, rowCount: totalInserted }
}
