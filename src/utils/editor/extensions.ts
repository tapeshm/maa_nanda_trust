import type { AnyExtension } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'

import type { EditorProfile } from '../../frontend/editor/types'
import imageFigure from './extensions/imageFigure'

export const PLACEHOLDER_TEXT = 'Start writing…'

// [D3:editor-tiptap.step-02:extensions-base] Base extensions shared by all profiles.
const baseExtensions: AnyExtension[] = [
  StarterKit,
  Placeholder.configure({
    placeholder: PLACEHOLDER_TEXT,
  }),
]

// [D3:editor-tiptap.step-02:extensions-list] Build the extension list for the requested profile.
export function extensionsList(profile: EditorProfile): AnyExtension[] {
  if (profile === 'full') {
    return [...baseExtensions, imageFigure]
  }

  return [...baseExtensions]
}
