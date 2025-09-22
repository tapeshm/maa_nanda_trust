// [D3:editor-tiptap.step-01:types] Shared editor type definitions.
export type EditorProfile = 'basic' | 'full'

export interface EditorInstance {
  destroy: () => void
}

export interface EditorFactoryContext {
  profile: EditorProfile
  root: HTMLElement
}

export type EditorFactory = (
  root: HTMLElement,
  context: EditorFactoryContext,
) => Promise<EditorInstance | void> | EditorInstance | void
