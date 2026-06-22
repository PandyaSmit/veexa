import { BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { IpcChannel } from '@shared/ipc'
import type {
  ConnectionConfig,
  ConnectionDraft,
  CreateTableDefinition,
  CsvExportRequest,
  HistoryEntry,
  PendingMutation,
  SavedQuery,
  SshConfig,
  TableDataOptions,
  TableRef
} from '@shared/types'
import { connectionsStore } from './store'
import { credentials } from './credentials'
import { closeSession, getSession, openSession, testConnection } from './database/sessions'
import { history } from './history'
import { savedQueries } from './savedQueries'
import { exportCsv } from './export'
import { importCsv } from './import'

type Draft = ConnectionDraft & { id?: string }

function toSshConfig(draft: Draft): SshConfig | null {
  if (!draft.ssh) return null
  const s = draft.ssh
  return {
    host: s.host,
    port: s.port,
    username: s.username,
    auth: s.auth,
    privateKeyPath: s.privateKeyPath,
    hasSecret: Boolean(s.secret)
  }
}

function toConfig(draft: Draft): ConnectionConfig {
  return {
    id: draft.id ?? randomUUID(),
    name: draft.name,
    driver: draft.driver,
    host: draft.host,
    port: draft.port,
    username: draft.username,
    database: draft.database,
    ssl: draft.ssl,
    readOnly: draft.readOnly,
    queryTimeoutMs: draft.queryTimeoutMs,
    hasPassword: Boolean(draft.password),
    ssh: toSshConfig(draft)
  }
}

export function registerIpc(): void {
  ipcMain.handle(IpcChannel.ConnectionsList, () => connectionsStore.list())

  ipcMain.handle(IpcChannel.ConnectionsUpsert, async (_evt, draft: Draft) => {
    const config = toConfig(draft)
    await connectionsStore.upsert(config)
    if (draft.password !== undefined && draft.password !== '') {
      await credentials.setDbPassword(config.id, draft.password)
    }
    if (draft.ssh?.secret !== undefined && draft.ssh.secret !== '') {
      await credentials.setSshSecret(config.id, draft.ssh.secret)
    }
    if (!draft.ssh) {
      await credentials.deleteSshSecret(config.id).catch(() => {})
    }
    return config
  })

  ipcMain.handle(IpcChannel.ConnectionsDelete, async (_evt, id: string) => {
    await closeSession(id)
    await credentials.deleteDbPassword(id).catch(() => {})
    await credentials.deleteSshSecret(id).catch(() => {})
    await connectionsStore.delete(id)
  })

  ipcMain.handle(IpcChannel.ConnectionsTest, async (_evt, draft: Draft) => {
    const config = toConfig(draft)
    return testConnection(config, draft.password ?? null, draft.ssh?.secret ?? null)
  })

  ipcMain.handle(IpcChannel.SessionOpen, async (_evt, id: string) => {
    const all = await connectionsStore.list()
    const config = all.find((c) => c.id === id)
    if (!config) throw new Error(`Unknown connection ${id}`)
    await openSession(config)
  })

  ipcMain.handle(IpcChannel.SessionClose, (_evt, id: string) => closeSession(id))

  ipcMain.handle(IpcChannel.SessionQuery, async (_evt, id: string, sql: string) => {
    const all = await connectionsStore.list()
    const conn = all.find((c) => c.id === id)
    const startedAt = Date.now()
    try {
      const result = await getSession(id).query(sql)
      const entry: HistoryEntry = {
        id: randomUUID(),
        connectionId: id,
        connectionName: conn?.name ?? id,
        sql,
        ok: true,
        rowCount: result.rowCount,
        durationMs: result.durationMs,
        ranAt: startedAt
      }
      history.append(entry).catch(() => {})
      return result
    } catch (err: any) {
      const entry: HistoryEntry = {
        id: randomUUID(),
        connectionId: id,
        connectionName: conn?.name ?? id,
        sql,
        ok: false,
        error: err?.message ?? String(err),
        ranAt: startedAt
      }
      history.append(entry).catch(() => {})
      throw err
    }
  })

  ipcMain.handle(IpcChannel.SessionSchema, (_evt, id: string) => getSession(id).schema())
  ipcMain.handle(IpcChannel.SessionColumns, (_evt, id: string) => getSession(id).columns())
  ipcMain.handle(IpcChannel.SessionCancel, (_evt, id: string) => getSession(id).cancel())

  ipcMain.handle(IpcChannel.SessionTableData, (_evt, id: string, opts: TableDataOptions) =>
    getSession(id).tableData(opts)
  )

  ipcMain.handle(IpcChannel.SessionTableStructure, (_evt, id: string, ref: TableRef) =>
    getSession(id).tableStructure(ref)
  )

  ipcMain.handle(IpcChannel.SessionTableForeignKeys, (_evt, id: string, ref: TableRef) =>
    getSession(id).tableForeignKeys(ref)
  )

  ipcMain.handle(
    IpcChannel.SessionPreviewCreateTable,
    (_evt, id: string, def: CreateTableDefinition) => getSession(id).previewCreateTable(def)
  )

  ipcMain.handle(
    IpcChannel.SessionCreateTable,
    async (_evt, id: string, def: CreateTableDefinition) => {
      const all = await connectionsStore.list()
      const conn = all.find((c) => c.id === id)
      if (conn?.readOnly) {
        throw new Error('Connection is read-only; mutations are disabled.')
      }
      await getSession(id).createTable(def)
    }
  )

  ipcMain.handle(
    IpcChannel.SessionPreviewMutations,
    (_evt, id: string, mutations: PendingMutation[]) =>
      getSession(id).previewMutations(mutations)
  )

  ipcMain.handle(
    IpcChannel.SessionCommitMutations,
    async (_evt, id: string, mutations: PendingMutation[]) => {
      const all = await connectionsStore.list()
      const conn = all.find((c) => c.id === id)
      if (conn?.readOnly) {
        throw new Error('Connection is read-only; mutations are disabled.')
      }
      await getSession(id).commitMutations(mutations)
    }
  )



  ipcMain.handle(IpcChannel.SessionDropTable, async (_evt, id: string, ref: TableRef) => {
    const all = await connectionsStore.list()
    const conn = all.find((c) => c.id === id)
    if (conn?.readOnly) throw new Error('Connection is read-only')
    await getSession(id).dropTable(ref)
  })

  ipcMain.handle(IpcChannel.SessionPreviewAlterTable, (_evt, id: string, ref: TableRef, def: AlterTableDefinition) => {
    return getSession(id).previewAlterTable(ref, def)
  })

  ipcMain.handle(IpcChannel.SessionAlterTable, async (_evt, id: string, ref: TableRef, def: AlterTableDefinition) => {
    const all = await connectionsStore.list()
    const conn = all.find((c) => c.id === id)
    if (conn?.readOnly) throw new Error('Connection is read-only')
    await getSession(id).alterTable(ref, def)
  })

  ipcMain.handle(IpcChannel.SavedQueriesList, () => savedQueries.list())
  ipcMain.handle(IpcChannel.SavedQueriesUpsert, (_evt, q: SavedQuery) => savedQueries.upsert(q))
  ipcMain.handle(IpcChannel.SavedQueriesDelete, (_evt, id: string) => savedQueries.delete(id))

  ipcMain.handle(IpcChannel.HistoryList, () => history.list())
  ipcMain.handle(IpcChannel.HistoryClear, () => history.clear())

  ipcMain.handle(IpcChannel.ExportCsv, (_evt, req: CsvExportRequest) => exportCsv(req))

  ipcMain.handle(IpcChannel.ImportCsv, (_evt, id: string, ref: TableRef) => importCsv(id, ref))

  // Window controls (used by custom title bar on Windows / Linux)
  ipcMain.handle(IpcChannel.WindowMinimize, (evt) => {
    BrowserWindow.fromWebContents(evt.sender)?.minimize()
  })
  ipcMain.handle(IpcChannel.WindowMaximize, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.handle(IpcChannel.WindowClose, (evt) => {
    BrowserWindow.fromWebContents(evt.sender)?.close()
  })

  // Platform info so renderer can adapt UI per-OS
  ipcMain.handle(IpcChannel.PlatformInfo, () => ({
    platform: process.platform as 'darwin' | 'win32' | 'linux'
  }))
}
