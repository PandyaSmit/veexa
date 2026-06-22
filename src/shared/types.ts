export type DriverKind = 'postgres' | 'mysql'

export type SshAuth = 'password' | 'key'

export interface SshConfig {
  host: string
  port: number
  username: string
  auth: SshAuth
  privateKeyPath?: string
  hasSecret?: boolean
}

export interface ConnectionConfig {
  id: string
  name: string
  driver: DriverKind
  host: string
  port: number
  username: string
  database: string
  ssl?: boolean
  readOnly?: boolean
  /** Server-side statement timeout in milliseconds. 0 / undefined = no timeout. */
  queryTimeoutMs?: number
  hasPassword?: boolean
  ssh?: SshConfig | null
}

export interface ColumnInfo {
  schema: string
  table: string
  column: string
  type: string
}

export interface ConnectionDraft extends Omit<ConnectionConfig, 'id' | 'hasPassword' | 'ssh'> {
  password?: string
  ssh?:
    | (Omit<SshConfig, 'hasSecret'> & {
        secret?: string
      })
    | null
}

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  durationMs: number
}

export interface TestResult {
  ok: boolean
  message?: string
}

export interface SchemaNode {
  name: string
  kind: 'schema' | 'table' | 'view'
  children?: SchemaNode[]
}

export interface HistoryEntry {
  id: string
  connectionId: string
  connectionName: string
  sql: string
  ok: boolean
  rowCount?: number
  durationMs?: number
  error?: string
  ranAt: number
}

export interface CsvExportRequest {
  defaultFileName: string
  columns: string[]
  rows: unknown[][]
}

export interface CsvExportResult {
  saved: boolean
  path?: string
}

export interface TableRef {
  schema: string
  name: string
}

export interface TableColumn {
  name: string
  type: string
  nullable: boolean
  default: string | null
  isPrimaryKey: boolean
}

export interface TableIndex {
  name: string
  columns: string[]
  unique: boolean
  primary: boolean
}

export interface TableStructure {
  ref: TableRef
  columns: TableColumn[]
  indexes: TableIndex[]
}

export interface TableFilter {
  column: string
  value: unknown
}

export type FilterOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'NOT LIKE'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'IN'

export interface FilterRule {
  id: string
  column: string
  operator: FilterOperator
  value: string
  enabled: boolean
}

export type FilterOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'NOT LIKE'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'IN'

export interface FilterRule {
  id: string
  column: string
  operator: FilterOperator
  value: string
  enabled: boolean
}

export interface TableDataOptions {
  ref: TableRef
  limit: number
  offset: number
  sortColumn?: string
  sortDir?: 'asc' | 'desc'
  filter?: TableFilter
  filters?: FilterRule[]
  filters?: FilterRule[]
}

export interface TableForeignKey {
  column: string
  referencedSchema: string
  referencedTable: string
  referencedColumn: string
}

export type PendingMutation =
  | { kind: 'update'; ref: TableRef; pk: TableFilter; set: Record<string, unknown> }
  | { kind: 'insert'; ref: TableRef; values: Record<string, unknown> }
  | { kind: 'delete'; ref: TableRef; pk: TableFilter }

export interface SavedQuery {
  id: string
  name: string
  connectionId: string | null
  sql: string
  createdAt: number
}

export interface TablePage {
  columns: string[]
  rows: unknown[][]
  hasMore: boolean
  total?: number
  durationMs: number
}

export interface CsvImportResult {
  imported: boolean
  rowCount: number
}

export type AlterColumnAction =
  | { kind: 'add'; column: CreateTableColumn }
  | { kind: 'drop'; column: string }
  | { kind: 'modify'; column: string; changes: Partial<CreateTableColumn> }

export interface AlterTableDefinition {
  actions: AlterColumnAction[]
}

export interface CreateTableColumn {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
  isPrimaryKey: boolean
}

export interface CreateTableDefinition {
  schema: string
  tableName: string
  columns: CreateTableColumn[]
}
