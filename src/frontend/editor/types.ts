// [D3:editor-tiptap.step-01:types] Shared editor type definitions.
import type { Editor, JSONContent as TiptapJSONContent } from '@tiptap/core'

export type EditorProfile = 'basic' | 'full'

// [D3:editor-tiptap.step-06:editor-instance] Expose the full Tiptap editor API for toolbar interactions.
export type EditorInstance = Editor

// [D3:editor-tiptap.step-03:json-types] Minimal ProseMirror JSON content shape used for hydration.
export type JSONContent = TiptapJSONContent

// [D3:editor-tiptap.step-03:context] Provide initialContent for factories to hydrate from SSR payloads.
export interface EditorFactoryContext {
  profile: EditorProfile
  root: HTMLElement
  initialContent: JSONContent
}

export type EditorFactory = (
  root: HTMLElement,
  context: EditorFactoryContext,
) => Promise<EditorInstance | void> | EditorInstance | void
