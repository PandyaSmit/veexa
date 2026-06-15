export const IpcChannel = {
  ConnectionsList: 'connections:list',
  ConnectionsUpsert: 'connections:upsert',
  ConnectionsDelete: 'connections:delete',
  ConnectionsTest: 'connections:test',
  SessionOpen: 'session:open',
  SessionClose: 'session:close',
  SessionQuery: 'session:query',
  SessionSchema: 'session:schema',
  SessionTableData: 'session:table-data',
  SessionTableStructure: 'session:table-structure',
  SessionTableForeignKeys: 'session:table-foreign-keys',
  SessionPreviewMutations: 'session:preview-mutations',
  SessionCommitMutations: 'session:commit-mutations',
  SessionCancel: 'session:cancel',
  SessionColumns: 'session:columns',
  SavedQueriesList: 'saved-queries:list',
  SavedQueriesUpsert: 'saved-queries:upsert',
  SavedQueriesDelete: 'saved-queries:delete',
  HistoryList: 'history:list',
  HistoryClear: 'history:clear',
  ExportCsv: 'export:csv'
} as const

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel]

const DESTRUCTIVE = /\b(DROP|TRUNCATE|DELETE|ALTER\s+TABLE|UPDATE)\b/i

/**
 * Returns the first destructive keyword found in an SQL statement, ignoring
 * single-line comments, block comments, and string literals.
 */
export function detectDestructive(sql: string): string | null {
  const stripped = sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '""')
  const match = stripped.match(DESTRUCTIVE)
  return match ? match[0].toUpperCase().replace(/\s+/g, ' ') : null
}
