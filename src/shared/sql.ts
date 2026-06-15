/**
 * Split a SQL script into individual statements on `;`, while ignoring semicolons
 * that occur inside string literals or comments. Empty statements are dropped.
 */
export function splitStatements(sql: string): string[] {
  const out: string[] = []
  let current = ''
  let i = 0
  let state: 'normal' | 'single' | 'double' | 'backtick' | 'line-comment' | 'block-comment' =
    'normal'

  while (i < sql.length) {
    const ch = sql[i]
    const next = sql[i + 1]

    if (state === 'normal') {
      if (ch === "'") state = 'single'
      else if (ch === '"') state = 'double'
      else if (ch === '`') state = 'backtick'
      else if (ch === '-' && next === '-') state = 'line-comment'
      else if (ch === '/' && next === '*') state = 'block-comment'
      else if (ch === ';') {
        const trimmed = current.trim()
        if (trimmed) out.push(trimmed)
        current = ''
        i++
        continue
      }
      current += ch
    } else if (state === 'single') {
      current += ch
      if (ch === "'" && next !== "'") state = 'normal'
      else if (ch === "'" && next === "'") {
        current += next
        i++
      }
    } else if (state === 'double') {
      current += ch
      if (ch === '"') state = 'normal'
    } else if (state === 'backtick') {
      current += ch
      if (ch === '`') state = 'normal'
    } else if (state === 'line-comment') {
      current += ch
      if (ch === '\n') state = 'normal'
    } else if (state === 'block-comment') {
      current += ch
      if (ch === '*' && next === '/') {
        current += next
        i += 2
        state = 'normal'
        continue
      }
    }
    i++
  }

  const tail = current.trim()
  if (tail) out.push(tail)
  return out
}
