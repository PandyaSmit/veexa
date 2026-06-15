import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import type { HistoryEntry } from '@shared/types'

const file = join(app.getPath('userData'), 'history.json')
const MAX_ENTRIES = 500

async function read(): Promise<HistoryEntry[]> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as HistoryEntry[]
  } catch (err: any) {
    if (err?.code === 'ENOENT') return []
    return []
  }
}

async function write(items: HistoryEntry[]): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(items, null, 2), 'utf8')
}

export const history = {
  list: () => read(),
  async append(entry: HistoryEntry): Promise<void> {
    const items = await read()
    items.unshift(entry)
    if (items.length > MAX_ENTRIES) items.length = MAX_ENTRIES
    await write(items)
  },
  async clear(): Promise<void> {
    await write([])
  }
}
