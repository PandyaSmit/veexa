import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/ipc'
import type {
  ColumnInfo,
  ConnectionConfig,
  ConnectionDraft,
  CreateTableDefinition,
  CreateTableDefinition,
  CsvExportRequest,
  CsvExportResult,
  CsvImportResult,
  HistoryEntry,
  PendingMutation,
  QueryResult,
  SavedQuery,
  SchemaNode,
  TableDataOptions,
  TableForeignKey,
  TablePage,
  TableRef,
  TableStructure,
  TestResult,
  AlterTableDefinition
} from '../shared/types'

type Draft = ConnectionDraft & { id?: string }

const api = {
  connections: {
    list: (): Promise<ConnectionConfig[]> => ipcRenderer.invoke(IpcChannel.ConnectionsList),
    upsert: (draft: Draft): Promise<ConnectionConfig> =>
      ipcRenderer.invoke(IpcChannel.ConnectionsUpsert, draft),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannel.ConnectionsDelete, id),
    test: (draft: Draft): Promise<TestResult> => ipcRenderer.invoke(IpcChannel.ConnectionsTest, draft)
  },
  session: {
    open: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannel.SessionOpen, id),
    close: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannel.SessionClose, id),
    query: (id: string, sql: string): Promise<QueryResult> =>
      ipcRenderer.invoke(IpcChannel.SessionQuery, id, sql),
    cancel: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannel.SessionCancel, id),
    schema: (id: string): Promise<SchemaNode[]> => ipcRenderer.invoke(IpcChannel.SessionSchema, id),
    columns: (id: string): Promise<ColumnInfo[]> => ipcRenderer.invoke(IpcChannel.SessionColumns, id),
    tableData: (id: string, opts: TableDataOptions): Promise<TablePage> =>
      ipcRenderer.invoke(IpcChannel.SessionTableData, id, opts),
    tableStructure: (id: string, ref: TableRef): Promise<TableStructure> =>
      ipcRenderer.invoke(IpcChannel.SessionTableStructure, id, ref),
    tableForeignKeys: (id: string, ref: TableRef): Promise<TableForeignKey[]> =>
      ipcRenderer.invoke(IpcChannel.SessionTableForeignKeys, id, ref),
    previewMutations: (id: string, mutations: PendingMutation[]): Promise<string[]> =>
      ipcRenderer.invoke(IpcChannel.SessionPreviewMutations, id, mutations),
    commitMutations: (id: string, mutations: PendingMutation[]): Promise<void> =>
      ipcRenderer.invoke(IpcChannel.SessionCommitMutations, id, mutations),
    importCsv: (id: string, ref: TableRef): Promise<CsvImportResult> =>
      ipcRenderer.invoke(IpcChannel.ImportCsv, id, ref),
    previewCreateTable: (id: string, def: CreateTableDefinition): Promise<string> =>
      ipcRenderer.invoke(IpcChannel.SessionPreviewCreateTable, id, def),
    createTable: (id: string, def: CreateTableDefinition): Promise<void> =>
      ipcRenderer.invoke(IpcChannel.SessionCreateTable, id, def),
    dropTable: (id: string, ref: TableRef): Promise<void> =>
      ipcRenderer.invoke(IpcChannel.SessionDropTable, id, ref),
    previewAlterTable: (id: string, ref: TableRef, def: AlterTableDefinition): Promise<string[]> =>
      ipcRenderer.invoke(IpcChannel.SessionPreviewAlterTable, id, ref, def),
    alterTable: (id: string, ref: TableRef, def: AlterTableDefinition): Promise<void> =>
      ipcRenderer.invoke(IpcChannel.SessionAlterTable, id, ref, def)
  },
  savedQueries: {
    list: (): Promise<SavedQuery[]> => ipcRenderer.invoke(IpcChannel.SavedQueriesList),
    upsert: (q: SavedQuery): Promise<SavedQuery> =>
      ipcRenderer.invoke(IpcChannel.SavedQueriesUpsert, q),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IpcChannel.SavedQueriesDelete, id)
  },
  history: {
    list: (): Promise<HistoryEntry[]> => ipcRenderer.invoke(IpcChannel.HistoryList),
    clear: (): Promise<void> => ipcRenderer.invoke(IpcChannel.HistoryClear)
  },
  exportCsv: (req: CsvExportRequest): Promise<CsvExportResult> =>
    ipcRenderer.invoke(IpcChannel.ExportCsv, req),
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke(IpcChannel.WindowMinimize),
    maximize: (): Promise<void> => ipcRenderer.invoke(IpcChannel.WindowMaximize),
    close: (): Promise<void> => ipcRenderer.invoke(IpcChannel.WindowClose)
  },
  platform: (): Promise<{ platform: 'darwin' | 'win32' | 'linux' }> =>
    ipcRenderer.invoke(IpcChannel.PlatformInfo)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
