import { memo, useCallback, useRef } from 'react'
import Monaco from '@monaco-editor/react'
import type { FileSystemAPI } from '@webcontainer/api'
import type * as monaco from 'monaco-editor'

import { useAppState } from 'src/states/app'
import { FileSystemTreeChange } from 'src/services/web-container/utils/file-tree'

import { initEditor } from '../modules/monaco'
import { useMainVSLiteAppContext } from '../contexts/main'

interface EditorProps {
  fs: FileSystemAPI
  path: string
}

export type Editor = monaco.editor.IStandaloneCodeEditor
export type Monaco = typeof monaco

export const EditorInner = memo(
  (props: EditorProps & { onUpdateFileContent: (changes: FileSystemTreeChange[]) => void }) => {
    const fileChangeDebounceRef = useRef<number>()
    const currentContentRef = useRef<string>('')
    const isDarkTheme = useAppState((state) => state.theme === 'dark')
    const handleOnChange = useCallback(
      (value?: string) => {
        if (fileChangeDebounceRef.current) {
          clearTimeout(fileChangeDebounceRef.current)
        }
        if (currentContentRef.current === value) {
          return
        }
        fileChangeDebounceRef.current = setTimeout(() => {
          if (currentContentRef.current === value) {
            return
          }
          fileChangeDebounceRef.current = undefined
          currentContentRef.current = value || ''
          props.fs.writeFile(props.path, value || '', 'utf-8')
          props.onUpdateFileContent([{ path: props.path, content: value || '' }])
        }, 500) as unknown as number
      },
      [props],
    )
    const handleMount = useCallback(
      (editor: Editor, monaco: Monaco) => {
        return initEditor(editor, monaco, props.fs, props.path).then((content) => {
          currentContentRef.current = content
        })
      },
      [props.fs, props.path],
    )
    return (
      <Monaco
        path={props.path}
        className="nodrag nowheel"
        theme={isDarkTheme ? 'vs-dark' : 'vs-light'}
        options={{ readOnly: false, padding: { top: 10 }, tabSize: 2 }}
        onMount={handleMount}
        onChange={handleOnChange}
      />
    )
  },
)

export const Editor = (props: EditorProps) => {
  const { container, onUpdateFileContent } = useMainVSLiteAppContext()
  if (!container) {
    return
  }
  return <EditorInner fs={props.fs} path={props.path} onUpdateFileContent={onUpdateFileContent} />
}
