import type { AnyExtension } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'

import type { EditorProfile } from '../../frontend/editor/types'
import { isFullEditorProfile } from '../../editor/constants'
// [D3:editor-tiptap.step-12:import-image-figure] Use custom ImageFigure extension
import { ImageFigure } from '../../frontend/editor/extensions/imageFigure'

export const PLACEHOLDER_TEXT = 'Start writing…'

// [D3:editor-tiptap.step-02:extensions-base] Base extensions shared by all profiles.
const baseExtensions: AnyExtension[] = [
  StarterKit,
  Placeholder.configure({
    placeholder: PLACEHOLDER_TEXT,
  }),
]

// [D3:editor-tiptap.step-02:extensions-list] Build the extension list for the requested profile.
// [D3:editor-tiptap.step-12:use-image-figure] Use ImageFigure extension for full profile
export function extensionsList(profile: EditorProfile): AnyExtension[] {
  if (isFullEditorProfile(profile)) {
    return [...baseExtensions, ImageFigure]
  }

  return [...baseExtensions]
}
