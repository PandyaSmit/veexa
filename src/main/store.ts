import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import type { ConnectionConfig } from '@shared/types'

const file = join(app.getPath('userData'), 'connections.json')

async function readFileSafe(): Promise<ConnectionConfig[]> {
  try {
    const raw = await readFile(file, 'utf8')
    return JSON.parse(raw) as ConnectionConfig[]
  } catch (err: any) {
    if (err?.code === 'ENOENT') return []
    throw err
  }
}

async function writeFileSafe(items: ConnectionConfig[]): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(items, null, 2), 'utf8')
}

export const connectionsStore = {
  list: () => readFileSafe(),
  async upsert(conn: ConnectionConfig): Promise<ConnectionConfig> {
    const all = await readFileSafe()
    const idx = all.findIndex((c) => c.id === conn.id)
    if (idx >= 0) all[idx] = conn
    else all.push(conn)
    await writeFileSafe(all)
    return conn
  },
  async delete(id: string): Promise<void> {
    const all = await readFileSafe()
    await writeFileSafe(all.filter((c) => c.id !== id))
  }
}
