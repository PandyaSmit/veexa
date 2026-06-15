import net from 'node:net'
import { readFile } from 'node:fs/promises'
import { Client } from 'ssh2'
import type { SshConfig } from '@shared/types'

export interface Tunnel {
  localPort: number
  close(): Promise<void>
}

export interface TunnelTarget {
  host: string
  port: number
}

export async function openTunnel(
  ssh: SshConfig,
  target: TunnelTarget,
  secret: string | null
): Promise<Tunnel> {
  const client = new Client()
  const connectOpts: Parameters<Client['connect']>[0] = {
    host: ssh.host,
    port: ssh.port,
    username: ssh.username,
    readyTimeout: 15_000
  }
  if (ssh.auth === 'password') {
    connectOpts.password = secret ?? undefined
  } else {
    if (!ssh.privateKeyPath) throw new Error('SSH private key path is required')
    connectOpts.privateKey = await readFile(ssh.privateKeyPath)
    if (secret) connectOpts.passphrase = secret
  }

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => reject(err)
    client.once('ready', () => {
      client.off('error', onError)
      resolve()
    })
    client.once('error', onError)
    client.connect(connectOpts)
  })

  const server = net.createServer((socket) => {
    client.forwardOut(
      '127.0.0.1',
      (socket.remotePort as number) ?? 0,
      target.host,
      target.port,
      (err, stream) => {
        if (err) {
          socket.destroy(err)
          return
        }
        socket.pipe(stream).pipe(socket)
      }
    )
  })

  const localPort: number = await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') resolve(addr.port)
      else reject(new Error('Failed to obtain tunnel local port'))
    })
  })

  return {
    localPort,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      client.end()
    }
  }
}
