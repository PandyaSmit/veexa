import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import type { SavedQuery } from '@shared/types'

const file = join(app.getPath('userData'), 'saved-queries.json')

async function read(): Promise<SavedQuery[]> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as SavedQuery[]
  } catch {
    return []
  }
}

async function write(items: SavedQuery[]): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(items, null, 2), 'utf8')
}

export const savedQueries = {
  list: () => read(),
  async upsert(q: SavedQuery): Promise<SavedQuery> {
    const all = await read()
    const idx = all.findIndex((x) => x.id === q.id)
    if (idx >= 0) all[idx] = q
    else all.unshift(q)
    await write(all)
    return q
  },
  async delete(id: string): Promise<void> {
    const all = await read()
    await write(all.filter((x) => x.id !== id))
  }
}
