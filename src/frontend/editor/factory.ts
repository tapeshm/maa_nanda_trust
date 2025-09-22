import { Editor } from '@tiptap/core'

import type { EditorFactory, EditorInstance, EditorProfile } from './types'
import { extensionsList } from '../../utils/editor/extensions'

export const EDITOR_CLASSNAME = 'prose max-w-none focus:outline-none'

// [D3:editor-tiptap.step-02:create-editor] Instantiate a Tiptap editor with shared configuration.
export function createEditor(element: HTMLElement, profile: EditorProfile): EditorInstance {
  const editor = new Editor({
    element,
    extensions: extensionsList(profile),
    injectCSS: false,
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
  return (element) => createEditor(element, profile)
}

// [D3:editor-tiptap.step-02:register-node] Convenience helper for registering default profiles.
export function registerDefaultEditorProfiles(
  register: (profile: EditorProfile, factory: EditorFactory) => void,
): void {
  const profiles: EditorProfile[] = ['basic', 'full']

  profiles.forEach((profile) => {
    register(profile, createEditorFactory(profile))
  })
}
