export const EDITOR_PROFILES = ['basic', 'full'] as const
export type EditorProfile = (typeof EDITOR_PROFILES)[number]

export const EDITOR_PROFILE_BASIC: EditorProfile = EDITOR_PROFILES[0]
export const EDITOR_PROFILE_FULL: EditorProfile = EDITOR_PROFILES[1]
export const DEFAULT_EDITOR_PROFILE: EditorProfile = EDITOR_PROFILE_BASIC

export const EDITOR_DOCUMENT_NODES = ['doc'] as const
export const EDITOR_TEXT_NODES = ['text'] as const
export const EDITOR_BLOCK_NODES = [
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'codeBlock',
] as const
export const EDITOR_LEAF_NODES = ['hardBreak', 'horizontalRule'] as const

export const EDITOR_OPTIONAL_IMAGE_NODE = {
  name: 'imageFigure' as const,
  attrs: ['src', 'alt', 'size', 'align', 'wrap'] as const,
}

export const EDITOR_LEGACY_IMAGE_NODE = 'image'

export const EDITOR_BASE_MARK_TYPES = ['bold', 'italic', 'strike', 'code'] as const

type DataAttributeDefinition<Attr extends `data-${string}`, Dataset extends string> = {
  attr: Attr
  dataset: Dataset
  selector: `[${Attr}]`
}

function defineDataAttribute<Attr extends `data-${string}`, Dataset extends string>(
  attr: Attr,
  dataset: Dataset,
): DataAttributeDefinition<Attr, Dataset> {
  return {
    attr,
    dataset,
    selector: `[${attr}]` as const,
  }
}

export const EDITOR_DATA_ATTRIBUTES = {
  root: defineDataAttribute('data-editor', 'editor'),
  profile: defineDataAttribute('data-editor-profile', 'editorProfile'),
  form: defineDataAttribute('data-editor-form', 'editorForm'),
  toolbar: defineDataAttribute('data-editor-toolbar', 'editorToolbar'),
  toolbarFor: defineDataAttribute('data-editor-for', 'editorFor'),
  toolbarId: defineDataAttribute('data-editor-toolbar-id', 'editorToolbarId'),
  command: defineDataAttribute('data-editor-command', 'editorCommand'),
  imageInputId: defineDataAttribute('data-editor-image-input-id', 'editorImageInputId'),
  imagePanelId: defineDataAttribute('data-editor-image-panel-id', 'editorImagePanelId'),
  imageAltId: defineDataAttribute('data-editor-image-alt-id', 'editorImageAltId'),
  hiddenJsonField: defineDataAttribute('data-editor-field', 'editorField'),
  hiddenHtmlField: defineDataAttribute('data-editor-html-field', 'editorHtmlField'),
} as const

export type EditorDataAttributeName = keyof typeof EDITOR_DATA_ATTRIBUTES
export type EditorDataAttribute = (typeof EDITOR_DATA_ATTRIBUTES)[EditorDataAttributeName]

export type EditorNodeName =
  | (typeof EDITOR_DOCUMENT_NODES)[number]
  | (typeof EDITOR_TEXT_NODES)[number]
  | (typeof EDITOR_BLOCK_NODES)[number]
  | (typeof EDITOR_LEAF_NODES)[number]
  | typeof EDITOR_OPTIONAL_IMAGE_NODE.name

export type EditorMarkName = (typeof EDITOR_BASE_MARK_TYPES)[number]

export function resolveEditorProfile(value: unknown): EditorProfile {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === EDITOR_PROFILE_FULL) {
      return EDITOR_PROFILE_FULL
    }
  }
  return DEFAULT_EDITOR_PROFILE
}

export function isFullEditorProfile(profile: EditorProfile): boolean {
  return profile === EDITOR_PROFILE_FULL
}
