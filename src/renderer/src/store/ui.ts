import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'veexa:theme'
const SIDEBAR_KEY = 'veexa:sidebar'

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark'
}

function loadSidebar(): boolean {
  const stored = localStorage.getItem(SIDEBAR_KEY)
  return stored === null ? true : stored === 'open'
}

export interface ConnectionError {
  connectionId: string
  message: string
}

interface UiState {
  palette: boolean
  editingConnection: string | null | undefined
  theme: Theme
  sidebarOpen: boolean
  connectionError: ConnectionError | null
  togglePalette: (open?: boolean) => void
  openNewConnection: () => void
  openEditConnection: (id: string) => void
  closeConnectionDialog: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  toggleSidebar: () => void
  setConnectionError: (err: ConnectionError | null) => void
}

export const useUi = create<UiState>((set, get) => ({
  palette: false,
  editingConnection: undefined,
  theme: loadTheme(),
  sidebarOpen: loadSidebar(),
  connectionError: null,

  togglePalette(open) {
    set({ palette: open ?? !get().palette })
  },
  openNewConnection() {
    set({ editingConnection: null })
  },
  openEditConnection(id) {
    set({ editingConnection: id })
  },
  closeConnectionDialog() {
    set({ editingConnection: undefined })
  },
  setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme)
    set({ theme })
  },
  toggleTheme() {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
  toggleSidebar() {
    const next = !get().sidebarOpen
    localStorage.setItem(SIDEBAR_KEY, next ? 'open' : 'closed')
    set({ sidebarOpen: next })
  },
  setConnectionError(err) {
    set({ connectionError: err })
  }
}))

// Apply theme class to <html> whenever it changes.
useUi.subscribe((state, prev) => {
  if (state.theme !== prev?.theme) {
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }
})
// Initial apply.
document.documentElement.classList.toggle('dark', useUi.getState().theme === 'dark')
