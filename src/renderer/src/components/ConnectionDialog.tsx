import { useEffect, useState } from 'react'
import type { ConnectionDraft, DriverKind, SshAuth } from '@shared/types'
import { useConnections } from '../store/connections'

interface Props {
  editingId: string | null
  onClose: () => void
}

const driverDefaults: Record<DriverKind, { port: number }> = {
  postgres: { port: 5432 },
  mysql: { port: 3306 }
}

type SshDraft = NonNullable<ConnectionDraft['ssh']>

const emptySsh = (): SshDraft => ({
  host: '',
  port: 22,
  username: '',
  auth: 'password',
  privateKeyPath: '',
  secret: ''
})

export function ConnectionDialog({ editingId, onClose }: Props) {
  const items = useConnections((s) => s.items)
  const upsert = useConnections((s) => s.upsert)
  const existing = editingId ? items.find((i) => i.id === editingId) : null

  const [form, setForm] = useState<ConnectionDraft>({
    name: existing?.name ?? 'New connection',
    driver: existing?.driver ?? 'postgres',
    host: existing?.host ?? 'localhost',
    port: existing?.port ?? driverDefaults.postgres.port,
    username: existing?.username ?? '',
    database: existing?.database ?? '',
    ssl: existing?.ssl ?? false,
    readOnly: existing?.readOnly ?? false,
    queryTimeoutMs: existing?.queryTimeoutMs ?? 0,
    password: '',
    ssh: existing?.ssh
      ? {
          host: existing.ssh.host,
          port: existing.ssh.port,
          username: existing.ssh.username,
          auth: existing.ssh.auth,
          privateKeyPath: existing.ssh.privateKeyPath ?? '',
          secret: ''
        }
      : null
  })
  const [test, setTest] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function update<K extends keyof ConnectionDraft>(key: K, value: ConnectionDraft[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updateSsh<K extends keyof SshDraft>(key: K, value: SshDraft[K]) {
    setForm((f) => (f.ssh ? { ...f, ssh: { ...f.ssh, [key]: value } } : f))
  }

  async function handleSave() {
    setBusy(true)
    try {
      await upsert({ ...form, id: editingId ?? undefined })
      onClose()
    } catch (err: any) {
      setTest(err?.message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleTest() {
    setBusy(true)
    setTest(null)
    try {
      const res = await window.api.connections.test({ ...form, id: editingId ?? undefined })
      setTest(res.ok ? 'Connection successful' : `Failed: ${res.message ?? 'unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-drag">
      <div className="w-[520px] max-h-[90vh] overflow-y-auto bg-surface-elevated border border-line rounded-xl shadow-2xl p-5">
        <div className="text-sm font-semibold mb-4">
          {editingId ? 'Edit connection' : 'New connection'}
        </div>

        <div className="space-y-3 text-sm">
          <Field label="Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Driver">
              <select
                className={inputCls}
                value={form.driver}
                onChange={(e) => {
                  const driver = e.target.value as DriverKind
                  update('driver', driver)
                  update('port', driverDefaults[driver].port)
                }}
              >
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
            </Field>
            <Field label="Port">
              <input
                type="number"
                className={inputCls}
                value={form.port}
                onChange={(e) => update('port', Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Host">
            <input
              className={inputCls}
              value={form.host}
              onChange={(e) => update('host', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Database">
              <input
                className={inputCls}
                value={form.database}
                onChange={(e) => update('database', e.target.value)}
              />
            </Field>
            <Field label="Username">
              <input
                className={inputCls}
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
              />
            </Field>
          </div>
          <Field label={editingId ? 'Password (leave blank to keep)' : 'Password'}>
            <input
              type="password"
              className={inputCls}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={!!form.ssl}
                onChange={(e) => update('ssl', e.target.checked)}
              />
              Use SSL
            </label>
            <label
              className="flex items-center gap-2 text-xs text-fg-muted"
              title="Block all write operations from the app"
            >
              <input
                type="checkbox"
                checked={!!form.readOnly}
                onChange={(e) => update('readOnly', e.target.checked)}
              />
              Read-only
            </label>
          </div>
          <Field label="Query timeout (ms, 0 = no limit)">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.queryTimeoutMs ?? 0}
              onChange={(e) => update('queryTimeoutMs', Number(e.target.value) || 0)}
            />
          </Field>

          <div className="border-t border-line/70 pt-3 mt-3">
            <label className="flex items-center gap-2 text-xs text-fg">
              <input
                type="checkbox"
                checked={!!form.ssh}
                onChange={(e) => update('ssh', e.target.checked ? emptySsh() : null)}
              />
              Connect via SSH tunnel
            </label>

            {form.ssh && (
              <div className="mt-3 space-y-3 pl-4 border-l border-line/70">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="SSH host">
                    <input
                      className={inputCls}
                      value={form.ssh.host}
                      onChange={(e) => updateSsh('host', e.target.value)}
                    />
                  </Field>
                  <Field label="SSH port">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.ssh.port}
                      onChange={(e) => updateSsh('port', Number(e.target.value))}
                    />
                  </Field>
                </div>
                <Field label="SSH username">
                  <input
                    className={inputCls}
                    value={form.ssh.username}
                    onChange={(e) => updateSsh('username', e.target.value)}
                  />
                </Field>
                <Field label="Auth method">
                  <select
                    className={inputCls}
                    value={form.ssh.auth}
                    onChange={(e) => updateSsh('auth', e.target.value as SshAuth)}
                  >
                    <option value="password">Password</option>
                    <option value="key">Private key</option>
                  </select>
                </Field>
                {form.ssh.auth === 'key' && (
                  <Field label="Private key path">
                    <input
                      className={inputCls}
                      placeholder="/Users/you/.ssh/id_ed25519"
                      value={form.ssh.privateKeyPath ?? ''}
                      onChange={(e) => updateSsh('privateKeyPath', e.target.value)}
                    />
                  </Field>
                )}
                <Field
                  label={
                    form.ssh.auth === 'password'
                      ? editingId
                        ? 'SSH password (leave blank to keep)'
                        : 'SSH password'
                      : editingId
                        ? 'Key passphrase (leave blank to keep)'
                        : 'Key passphrase (optional)'
                  }
                >
                  <input
                    type="password"
                    className={inputCls}
                    value={form.ssh.secret ?? ''}
                    onChange={(e) => updateSsh('secret', e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>

        {test && (
          <div className="mt-3 text-xs text-fg bg-surface-sunken p-2 rounded border border-line whitespace-pre-wrap">
            {test}
          </div>
        )}

        <div className="mt-5 flex justify-between items-center">
          <button
            onClick={handleTest}
            disabled={busy}
            className="text-xs text-fg hover:text-white"
          >
            Test connection
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-md border border-line hover:bg-fg/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-fg hover:opacity-90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full bg-surface border border-line rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] text-fg-muted mb-1">{label}</div>
      {children}
    </label>
  )
}
