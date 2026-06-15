import type { ConnectionConfig } from '@shared/types'
import { credentials } from '../credentials'
import { openTunnel, type Tunnel } from '../ssh'
import { PostgresDriver } from './postgres'
import { MySqlDriver } from './mysql'
import type { Driver } from './types'

interface Session {
  driver: Driver
  tunnel?: Tunnel
}

const sessions = new Map<string, Session>()

function createDriver(kind: ConnectionConfig['driver']): Driver {
  switch (kind) {
    case 'postgres':
      return new PostgresDriver()
    case 'mysql':
      return new MySqlDriver()
    default:
      throw new Error(`Unsupported driver: ${kind}`)
  }
}

async function buildSession(
  config: ConnectionConfig,
  dbPassword: string | null,
  sshSecret: string | null
): Promise<Session> {
  let tunnel: Tunnel | undefined
  let host = config.host
  let port = config.port

  if (config.ssh) {
    tunnel = await openTunnel(
      config.ssh,
      { host: config.host, port: config.port },
      sshSecret
    )
    host = '127.0.0.1'
    port = tunnel.localPort
  }

  const driver = createDriver(config.driver)
  try {
    await driver.open({ ...config, host, port }, dbPassword)
  } catch (err) {
    await tunnel?.close().catch(() => {})
    throw err
  }
  return { driver, tunnel }
}

export async function openSession(config: ConnectionConfig): Promise<void> {
  await closeSession(config.id)
  const dbPassword = await credentials.getDbPassword(config.id)
  const sshSecret = config.ssh ? await credentials.getSshSecret(config.id) : null
  const session = await buildSession(config, dbPassword, sshSecret)
  sessions.set(config.id, session)
}

export function getSession(id: string): Driver {
  const s = sessions.get(id)
  if (!s) throw new Error(`No active session for ${id}`)
  return s.driver
}

export async function closeSession(id: string): Promise<void> {
  const s = sessions.get(id)
  if (!s) return
  sessions.delete(id)
  try {
    await s.driver.close()
  } catch {
    /* swallow */
  }
  try {
    await s.tunnel?.close()
  } catch {
    /* swallow */
  }
}

export async function closeAllSessions(): Promise<void> {
  await Promise.all([...sessions.keys()].map(closeSession))
}

export async function testConnection(
  config: ConnectionConfig,
  dbPassword: string | null,
  sshSecret: string | null
) {
  try {
    const session = await buildSession(config, dbPassword, sshSecret)
    await session.driver.close()
    await session.tunnel?.close()
    return { ok: true as const }
  } catch (err: any) {
    return { ok: false as const, message: err?.message ?? String(err) }
  }
}
