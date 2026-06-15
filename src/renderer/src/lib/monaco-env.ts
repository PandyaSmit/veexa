import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { registerSqlAutocomplete } from './sqlAutocomplete'

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  }
}

registerSqlAutocomplete()
