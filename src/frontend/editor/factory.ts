import { Editor } from '@tiptap/core'

import type { EditorFactory, EditorInstance, EditorProfile } from './types'
import { EDITOR_PROFILES } from '../../editor/constants'
import { extensionsList } from '../../utils/editor/extensions'
import { EDITOR_CLASSNAME } from './styles'

// [D3:editor-tiptap.step-02:create-editor] Instantiate a Tiptap editor with shared configuration.
export function createEditor(
  element: HTMLElement,
  profile: EditorProfile,
  content?: import('./types').JSONContent | string,
): EditorInstance {
  // Progressive enhancement: ensure element is contenteditable prior to Tiptap mount
  // so users can focus and type even if hydration is delayed.
  // (Handled by Tiptap via editorProps; avoid hardcoding here to keep concerns separate.)

  const editor = new Editor({
    element,
    extensions: extensionsList(profile),
    injectCSS: false,
    // [D3:editor-tiptap.step-03:content] Hydrate from SSR JSON when available.
    content,
    editorProps: {
      attributes: {
        class: EDITOR_CLASSNAME,
      },
    },
  })

  return editor as EditorInstance
}

// [D3:editor-tiptap.step-02:create-factory] Build a factory compatible with the bootstrap registry.
export function createEditorFactory(profile: EditorProfile): EditorFactory {
  return (element, ctx) => createEditor(element, profile, ctx.initialContent)
}

// [D3:editor-tiptap.step-02:register-node] Convenience helper for registering default profiles.
export function registerDefaultEditorProfiles(
  register: (profile: EditorProfile, factory: EditorFactory) => void,
): void {
  EDITOR_PROFILES.forEach((profile) => {
    register(profile, createEditorFactory(profile))
  })
}
