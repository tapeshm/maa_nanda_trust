// [D3:editor-tiptap.step-01:types] Shared editor type definitions.
// [D3:editor-tiptap.step-01:types] Shared editor type definitions.
export type EditorProfile = 'basic' | 'full'

export interface EditorInstance {
  destroy: () => void
}

// [D3:editor-tiptap.step-03:json-types] Minimal ProseMirror JSON content shape used for hydration.
export type JSONContent = import('@tiptap/core').JSONContent

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
