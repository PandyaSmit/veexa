import { dialog, BrowserWindow } from 'electron'
import { writeFile } from 'node:fs/promises'
import type { CsvExportRequest, CsvExportResult } from '@shared/types'

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s: string
  if (typeof v === 'object') {
    try {
      s = JSON.stringify(v)
    } catch {
      s = String(v)
    }
  } else {
    s = String(v)
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv(columns: string[], rows: unknown[][]): string {
  const lines = [columns.map(csvCell).join(',')]
  for (const row of rows) {
    lines.push(columns.map((_, i) => csvCell(row?.[i])).join(','))
  }
  return lines.join('\n')
}

export async function exportCsv(req: CsvExportRequest): Promise<CsvExportResult> {
  const win = BrowserWindow.getFocusedWindow() ?? undefined
  const result = await dialog.showSaveDialog(win!, {
    title: 'Export CSV',
    defaultPath: req.defaultFileName,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })
  if (result.canceled || !result.filePath) return { saved: false }
  await writeFile(result.filePath, toCsv(req.columns, req.rows), 'utf8')
  return { saved: true, path: result.filePath }
}
