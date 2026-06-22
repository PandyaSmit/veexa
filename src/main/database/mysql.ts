import mysql from 'mysql2/promise'
import type {
  ColumnInfo,
  ConnectionConfig,
  CreateTableDefinition,
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
import type { Driver } from './types'

const ident = (name: string): string => `\`${name.replace(/`/g, '``')}\``
const qualified = (ref: TableRef): string => `${ident(ref.schema)}.${ident(ref.name)}`

export class MySqlDriver implements Driver {
  private conn: mysql.Connection | null = null
  private connectOpts: mysql.ConnectionOptions | null = null

  async open(config: ConnectionConfig, password: string | null): Promise<void> {
    this.connectOpts = {
      host: config.host,
      port: config.port,
      user: config.username,
      password: password ?? undefined,
      database: config.database,
      ssl: config.ssl ? {} : undefined,
      rowsAsArray: true
    }
    this.conn = await mysql.createConnection(this.connectOpts)
    if (config.queryTimeoutMs && config.queryTimeoutMs > 0) {
      // MySQL 5.7+: per-session execution time limit (SELECT only). Best-effort.
      await this.conn
        .query(`SET SESSION MAX_EXECUTION_TIME = ${Math.floor(config.queryTimeoutMs)}`)
        .catch(() => {})
    }
  }

  async cancel(): Promise<void> {
    if (!this.conn || !this.connectOpts) return
    const threadId = (this.conn as any).threadId as number | undefined
    if (!threadId) return
    const aux = await mysql.createConnection(this.connectOpts)
    try {
      await aux.query(`KILL QUERY ${Number(threadId)}`)
    } finally {
      await aux.end().catch(() => {})
    }
  }

  async columns(): Promise<ColumnInfo[]> {
    const [rows] = await this.db.query<mysql.RowDataPacket[]>(
      `SELECT table_schema, table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema NOT IN ('mysql','information_schema','performance_schema','sys')
       ORDER BY table_schema, table_name, ordinal_position`
    )
    return (rows as any[]).map((r) => ({
      schema: r.table_schema ?? r.TABLE_SCHEMA,
      table: r.table_name ?? r.TABLE_NAME,
      column: r.column_name ?? r.COLUMN_NAME,
      type: r.data_type ?? r.DATA_TYPE
    }))
  }

  private get db(): mysql.Connection {
    if (!this.conn) throw new Error('Not connected')
    return this.conn
  }

  async query(sql: string): Promise<QueryResult> {
    const started = performance.now()
    const [rows, fields] = await this.db.query(sql)
    const cols = Array.isArray(fields) ? fields.map((f: any) => f.name as string) : []
    const data = Array.isArray(rows) ? (rows as unknown[][]) : []
    return {
      columns: cols,
      rows: data,
      rowCount: data.length,
      durationMs: Math.round(performance.now() - started)
    }
  }

  async schema(): Promise<SchemaNode[]> {
    const [rows] = await this.db.query<mysql.RowDataPacket[]>(
      `SELECT table_schema, table_name, table_type
       FROM information_schema.tables
       WHERE table_schema NOT IN ('mysql','information_schema','performance_schema','sys')
       ORDER BY table_schema, table_name`
    )
    const bySchema = new Map<string, SchemaNode>()
    for (const row of rows as any[]) {
      const schemaName = row.table_schema ?? row.TABLE_SCHEMA
      const tableName = row.table_name ?? row.TABLE_NAME
      const tableType = row.table_type ?? row.TABLE_TYPE
      let node = bySchema.get(schemaName)
      if (!node) {
        node = { name: schemaName, kind: 'schema', children: [] }
        bySchema.set(schemaName, node)
      }
      node.children!.push({
        name: tableName,
        kind: tableType === 'VIEW' ? 'view' : 'table'
      })
    }
    return [...bySchema.values()]
  }

  async tableData(opts: TableDataOptions): Promise<TablePage> {
    const limit = Math.max(1, Math.min(10_000, Math.floor(opts.limit)))
    const offset = Math.max(0, Math.floor(opts.offset))
    const orderClause = opts.sortColumn
      ? ` ORDER BY ${ident(opts.sortColumn)} ${opts.sortDir === 'desc' ? 'DESC' : 'ASC'}`
      : ''
    const params: unknown[] = []
    const conditions: string[] = []
    if (opts.filter) {
      params.push(opts.filter.value)
      conditions.push(`${ident(opts.filter.column)} = ?`)
    }
    if (opts.filters) {
      for (const rule of opts.filters) {
        if (!rule.enabled || !rule.column) continue
        const col = ident(rule.column)
        if (rule.operator === 'IS NULL') {
          conditions.push(`${col} IS NULL`)
        } else if (rule.operator === 'IS NOT NULL') {
          conditions.push(`${col} IS NOT NULL`)
        } else if (rule.operator === 'IN') {
          const vals = rule.value.split(',').map((v) => v.trim())
          const placeholders = vals.map((v) => {
            params.push(v)
            return '?'
          })
          conditions.push(`${col} IN (${placeholders.join(', ')})`)
        } else {
          params.push(rule.value)
          conditions.push(`${col} ${rule.operator} ?`)
        }
      }
    }
    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
    const sql = `SELECT * FROM ${qualified(opts.ref)}${whereClause}${orderClause} LIMIT ${limit + 1} OFFSET ${offset}`
    const started = performance.now()
    const [rows, fields] = await this.db.query(sql, params)
    const cols = Array.isArray(fields) ? fields.map((f: any) => f.name as string) : []
    const data = Array.isArray(rows) ? (rows as unknown[][]) : []
    const hasMore = data.length > limit
    return {
      columns: cols,
      rows: hasMore ? data.slice(0, limit) : data,
      hasMore,
      durationMs: Math.round(performance.now() - started)
    }
  }

  async tableStructure(ref: TableRef): Promise<TableStructure> {
    const [colsRows] = await this.db.query<mysql.RowDataPacket[]>(
      `SELECT column_name, column_type, is_nullable, column_default, column_key
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ?
       ORDER BY ordinal_position`,
      [ref.schema, ref.name]
    )
    const [idxRows] = await this.db.query<mysql.RowDataPacket[]>(
      `SELECT index_name, column_name, non_unique, seq_in_index
       FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = ?
       ORDER BY index_name, seq_in_index`,
      [ref.schema, ref.name]
    )

    const indexMap = new Map<
      string,
      { name: string; columns: string[]; unique: boolean; primary: boolean }
    >()
    for (const r of idxRows as any[]) {
      const name = r.index_name ?? r.INDEX_NAME
      const col = r.column_name ?? r.COLUMN_NAME
      const nonUnique = r.non_unique ?? r.NON_UNIQUE
      let entry = indexMap.get(name)
      if (!entry) {
        entry = {
          name,
          columns: [],
          unique: Number(nonUnique) === 0,
          primary: name === 'PRIMARY'
        }
        indexMap.set(name, entry)
      }
      entry.columns.push(col)
    }

    return {
      ref,
      columns: (colsRows as any[]).map((c) => ({
        name: c.column_name ?? c.COLUMN_NAME,
        type: c.column_type ?? c.COLUMN_TYPE,
        nullable: (c.is_nullable ?? c.IS_NULLABLE) === 'YES',
        default: c.column_default ?? c.COLUMN_DEFAULT ?? null,
        isPrimaryKey: (c.column_key ?? c.COLUMN_KEY) === 'PRI'
      })),
      indexes: [...indexMap.values()]
    }
  }

  async tableForeignKeys(ref: TableRef): Promise<TableForeignKey[]> {
    const [rows] = await this.db.query<mysql.RowDataPacket[]>(
      `SELECT column_name, referenced_table_schema, referenced_table_name, referenced_column_name
       FROM information_schema.key_column_usage
       WHERE table_schema = ? AND table_name = ? AND referenced_table_name IS NOT NULL`,
      [ref.schema, ref.name]
    )
    return (rows as any[]).map((r) => ({
      column: r.column_name ?? r.COLUMN_NAME,
      referencedSchema: r.referenced_table_schema ?? r.REFERENCED_TABLE_SCHEMA,
      referencedTable: r.referenced_table_name ?? r.REFERENCED_TABLE_NAME,
      referencedColumn: r.referenced_column_name ?? r.REFERENCED_COLUMN_NAME
    }))
  }

  previewMutations(mutations: PendingMutation[]): string[] {
    return mutations.map((m) => buildSql(m, true).text)
  }

  async commitMutations(mutations: PendingMutation[]): Promise<void> {
    if (mutations.length === 0) return
    const conn = this.db
    await conn.beginTransaction()
    try {
      for (const m of mutations) {
        const { text, values } = buildSql(m, false)
        await conn.query(text, values)
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback().catch(() => {})
      throw err
    }
  }

  previewCreateTable(def: CreateTableDefinition): string {
    return buildCreateTableSql(def)
  }

  async createTable(def: CreateTableDefinition): Promise<void> {
    const sql = buildCreateTableSql(def)
    await this.db.query(sql)
  }

  async dropTable(ref: TableRef): Promise<void> {
    const sql = `DROP TABLE ${ident(ref.schema)}.${ident(ref.name)}`
    await this.db.query(sql)
  }

  previewAlterTable(ref: TableRef, def: AlterTableDefinition): string[] {
    return buildAlterTableSql(ref, def)
  }

  async alterTable(ref: TableRef, def: AlterTableDefinition): Promise<void> {
    const stmts = buildAlterTableSql(ref, def)
    if (stmts.length === 0) return
    
    const conn = this.db
    await conn.beginTransaction()
    try {
      for (const stmt of stmts) {
        await conn.query(stmt)
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback().catch(() => {})
      throw err
    }
  }

  async close(): Promise<void> {
    await this.conn?.end()
    this.conn = null
  }
}

function literal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

function buildSql(m: PendingMutation, inlineValues: boolean): { text: string; values: unknown[] } {
  const table = `${ident(m.ref.schema)}.${ident(m.ref.name)}`
  if (m.kind === 'update') {
    const cols = Object.keys(m.set)
    const values: unknown[] = []
    const setClauses = cols.map((c) => {
      if (inlineValues) return `${ident(c)} = ${literal(m.set[c])}`
      values.push(m.set[c])
      return `${ident(c)} = ?`
    })
    let whereClause: string
    if (inlineValues) {
      whereClause = `${ident(m.pk.column)} = ${literal(m.pk.value)}`
    } else {
      values.push(m.pk.value)
      whereClause = `${ident(m.pk.column)} = ?`
    }
    return { text: `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClause}`, values }
  }
  if (m.kind === 'insert') {
    const cols = Object.keys(m.values)
    if (cols.length === 0) {
      return { text: `INSERT INTO ${table} () VALUES ()`, values: [] }
    }
    const values: unknown[] = []
    const placeholders = cols.map((c) => {
      if (inlineValues) return literal(m.values[c])
      values.push(m.values[c])
      return '?'
    })
    return {
      text: `INSERT INTO ${table} (${cols.map(ident).join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    }
  }
  const values: unknown[] = []
  let whereClause: string
  if (inlineValues) {
    whereClause = `${ident(m.pk.column)} = ${literal(m.pk.value)}`
  } else {
    values.push(m.pk.value)
    whereClause = `${ident(m.pk.column)} = ?`
  }
  return { text: `DELETE FROM ${table} WHERE ${whereClause}`, values }
}

function buildCreateTableSql(def: CreateTableDefinition): string {
  const table = `${ident(def.schema)}.${ident(def.tableName)}`
  const colDefs = def.columns.map(c => {
    let sql = `${ident(c.name)} ${c.type}`
    if (!c.nullable) sql += ' NOT NULL'
    if (c.defaultValue !== null && c.defaultValue !== '') {
      sql += ` DEFAULT ${c.defaultValue}`
    }
    return sql
  })

  const pks = def.columns.filter(c => c.isPrimaryKey)
  if (pks.length > 0) {
    colDefs.push(`PRIMARY KEY (${pks.map(c => ident(c.name)).join(', ')})`)
  }

  return `CREATE TABLE ${table} (\n  ${colDefs.join(',\n  ')}\n);`
}

function buildAlterTableSql(ref: TableRef, def: AlterTableDefinition): string[] {
  const table = `${ident(ref.schema)}.${ident(ref.name)}`
  const stmts: string[] = []

  for (const action of def.actions) {
    if (action.kind === 'add') {
      const c = action.column
      let sql = `ADD COLUMN ${ident(c.name)} ${c.type}`
      if (!c.nullable) sql += ' NOT NULL'
      if (c.defaultValue !== null && c.defaultValue !== '') {
        sql += ` DEFAULT ${c.defaultValue}`
      }
      stmts.push(`ALTER TABLE ${table} ${sql};`)
    } else if (action.kind === 'drop') {
      stmts.push(`ALTER TABLE ${table} DROP COLUMN ${ident(action.column)};`)
    } else if (action.kind === 'modify') {
      if (action.changes.name && action.changes.name !== action.column) {
         stmts.push(`ALTER TABLE ${table} RENAME COLUMN ${ident(action.column)} TO ${ident(action.changes.name)};`)
      }
      let modifySql = `MODIFY COLUMN ${ident(action.changes.name || action.column)}`
      if (action.changes.type) modifySql += ` ${action.changes.type}`
      if (action.changes.nullable === true) modifySql += ` NULL`
      if (action.changes.nullable === false) modifySql += ` NOT NULL`
      if (action.changes.defaultValue !== undefined) {
         if (action.changes.defaultValue === null || action.changes.defaultValue === '') {
            modifySql += ` DEFAULT NULL`
         } else {
            modifySql += ` DEFAULT ${action.changes.defaultValue}`
         }
      }
      if (action.changes.type || action.changes.nullable !== undefined || action.changes.defaultValue !== undefined) {
        stmts.push(`ALTER TABLE ${table} ${modifySql};`)
      }
    }
  }
  return stmts
}
