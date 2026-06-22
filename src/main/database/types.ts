import type {
  ColumnInfo,
  ConnectionConfig,
  CreateTableDefinition,
  PendingMutation,
  QueryResult,
  SchemaNode,
  TableDataOptions,
  TableForeignKey,
  TablePage,
  TableRef,
  TableStructure,
  AlterTableDefinition
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
  previewCreateTable(def: CreateTableDefinition): string
  createTable(def: CreateTableDefinition): Promise<void>
  dropTable(ref: TableRef): Promise<void>
  previewAlterTable(ref: TableRef, def: AlterTableDefinition): string[]
  alterTable(ref: TableRef, def: AlterTableDefinition): Promise<void>
  close(): Promise<void>
}
