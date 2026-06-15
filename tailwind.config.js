/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Inter',
          'system-ui',
          'sans-serif'
        ],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'monospace']
      },
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--surface-0) / <alpha-value>)',
          raised: 'rgb(var(--surface-1) / <alpha-value>)',
          elevated: 'rgb(var(--surface-2) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)'
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          muted: 'rgb(var(--fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--fg-subtle) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)'
        },
        danger: 'rgb(var(--danger) / <alpha-value>)'
      }
    }
  },
  plugins: []
}
