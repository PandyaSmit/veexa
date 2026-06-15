import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import { useUi } from '../store/ui'

interface Props {
  value: string
  onChange: (value: string) => void
  onRun?: () => void
}

export function QueryEditor({ value, onChange, onRun }: Props) {
  const theme = useUi((s) => s.theme)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  onChangeRef.current = onChange
  onRunRef.current = onRun

  useEffect(() => {
    if (!containerRef.current) return
    const editor = monaco.editor.create(containerRef.current, {
      value,
      language: 'sql',
      theme: theme === 'dark' ? 'vs-dark' : 'vs',
      fontSize: 13,
      fontFamily: 'SF Mono, Menlo, monospace',
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'none',
      padding: { top: 12, bottom: 12 }
    })
    editorRef.current = editor
    const sub = editor.onDidChangeModelContent(() => onChangeRef.current(editor.getValue()))
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.())
    return () => {
      sub.dispose()
      editor.dispose()
    }
  }, [])

  useEffect(() => {
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs')
  }, [theme])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.getValue() !== value) editor.setValue(value)
  }, [value])

  return <div ref={containerRef} className="h-full w-full" />
}
