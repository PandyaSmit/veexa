# Veexa

A modern, cross-platform database explorer for PostgreSQL and MySQL.

## Stack

Electron · React · TypeScript · Vite · Tailwind · Zustand · Monaco · TanStack Table/Virtual · keytar

## Development

```bash
npm install
npm run dev
```

## Build

```bash
# Package for your current OS
npm run package

# Package for specific platforms
npm run package:win
npm run package:mac
npm run package:linux
```

## Architecture

- `src/main` — Electron main process: window, IPC handlers, DB drivers, keychain, connection store.
- `src/preload` — `contextBridge`-exposed `window.api` (the only surface available to the renderer).
- `src/renderer` — React UI (Sidebar, ConnectionDialog, Monaco-based QueryEditor, virtualized ResultsTable).
- `src/shared` — types and IPC channel constants shared across processes.

Security: `contextIsolation: true`, `nodeIntegration: false`, strict CSP, no Node APIs in the renderer.

## Features

- Connection management with Keychain-backed credentials
- PostgreSQL + MySQL drivers
- SSH tunneling (password or private key auth)
- Sidebar DB tree with filter, Tables/Views grouped per schema
- Pin frequently-used tables to the top of the sidebar
- Saved queries library (per-connection)
- Multi-tab workspace — query tabs and table tabs side by side
- Tabs persist across app restarts
- Double-click a table to open a paginated data viewer with click-to-sort columns
- Table structure view: columns, types, nullability, defaults, primary keys, indexes
- Foreign-key navigation: click an FK cell to open the referenced row in a new tab
- Inline row editing in the data viewer (double-click to edit, "Add row" button, hover delete icon)
- Pending-changes badge with discard / "Review & Commit" — preview generated SQL, then run in a transaction
- Read-only mode per connection — disables all write paths client-side and rejects mutations at the IPC layer
- Per-connection query timeout (server-side `statement_timeout` / `MAX_EXECUTION_TIME`)
- Cancel a running query (Cancel button replaces Run while a query is in-flight)
- Schema-aware SQL autocomplete in Monaco (table + column suggestions, `table.` scopes to that table's columns)
- Friendly error dialog when a saved connection fails to open — with Retry and Edit shortcuts
- Multi-statement query support — each statement produces its own result sub-tab
- Cell peek modal for inspecting long values / pretty-printing JSON
- Monaco SQL editor
- Virtualized results grid
- CSV export (query results and table pages)
- CSV import (append CSV data to existing tables)
- Persistent query history (last 500 runs)
- Destructive-query confirmation (DROP / TRUNCATE / DELETE / UPDATE / ALTER TABLE)
- Light / dark theme with persistence
- Collapsible sidebar
- Command palette (⌘K)
- Start screen with recent connections card grid
- Bottom status bar with active connection + last-run timing

## Keyboard shortcuts

- `⌘K` / `Ctrl+K` — Command palette
- `⌘N` / `Ctrl+N` — New connection
- `⌘T` / `Ctrl+T` — New query tab
- `⌘W` / `Ctrl+W` — Close tab
- `⌘S` / `Ctrl+S` — Save current query
- `⌘B` / `Ctrl+B` — Toggle sidebar
- `⌘⇧L` / `Ctrl+Shift+L` — Toggle light/dark theme
- `⌘↩` / `Ctrl+Enter` — Run query
- `⌘⇧E` / `Ctrl+Shift+E` — Export to CSV
