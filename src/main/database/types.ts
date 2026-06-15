import type {
  ColumnInfo,
  ConnectionConfig,
  PendingMutation,
  QueryResult,
  SchemaNode,
  TableDataOptions,
  TableForeignKey,
  TablePage,
  TableRef,
  TableStructure
} from '@shared/types'

export interface Driver {
  open(config: ConnectionConfig, password: string | null): Promise<void>
  query(sql: string): Promise<QueryResult>
  cancel(): Promise<void>
  schema(): Promise<SchemaNode[]>
  columns(): Promise<ColumnInfo[]>
  tableData(opts: TableDataOptions): Promise<TablePage>
  tableStructure(ref: TableRef): Promise<TableStructure>
  tableForeignKeys(ref: TableRef): Promise<TableForeignKey[]>
  previewMutations(mutations: PendingMutation[]): string[]
  commitMutations(mutations: PendingMutation[]): Promise<void>
  close(): Promise<void>
}
