/**
 * Platform detection helper for the renderer process.
 * Caches the platform value after the first IPC call.
 */

let cachedPlatform: 'darwin' | 'win32' | 'linux' | null = null
let platformPromise: Promise<'darwin' | 'win32' | 'linux'> | null = null

export function getPlatform(): Promise<'darwin' | 'win32' | 'linux'> {
  if (cachedPlatform) return Promise.resolve(cachedPlatform)
  if (!platformPromise) {
    platformPromise = window.api.platform().then((info) => {
      cachedPlatform = info.platform
      return cachedPlatform
    })
  }
  return platformPromise
}

/** Synchronous check — returns 'darwin' until the async call resolves. */
export function getPlatformSync(): 'darwin' | 'win32' | 'linux' {
  return cachedPlatform ?? 'darwin'
}

/** Initialize early so the sync getter works as soon as possible. */
getPlatform()

/** Returns the modifier key symbol for keyboard shortcuts. */
export function modKey(): string {
  return getPlatformSync() === 'darwin' ? '⌘' : 'Ctrl+'
}
