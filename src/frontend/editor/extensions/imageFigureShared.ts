import type { EditorState } from '@tiptap/pm/state'
import { NodeSelection } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { EDITOR_OPTIONAL_IMAGE_NODE } from '../../../editor/constants'

export type ImageFigureSize = 's' | 'm' | 'l' | 'xl'
export type ImageFigureAlign = 'left' | 'center' | 'right'
export type ImageFigureWrap = 'text' | 'break'

export interface ImageFigureAttrs {
  src: string
  alt: string
  size: ImageFigureSize
  align: ImageFigureAlign
  wrap: ImageFigureWrap
}

export function clampImageFigureSize(size: unknown): ImageFigureSize {
  return size === 's' || size === 'm' || size === 'l' || size === 'xl' ? size : 'm'
}

export function clampImageFigureAlign(align: unknown): ImageFigureAlign {
  return align === 'left' || align === 'center' || align === 'right' ? align : 'center'
}

export function clampImageFigureWrap(wrap: unknown): ImageFigureWrap {
  return wrap === 'break' ? 'break' : 'text'
}

export function normalizeImageFigureAttrs(attrs: unknown): ImageFigureAttrs {
  const map = (attrs ?? {}) as Record<string, unknown>
  const src = typeof map.src === 'string' ? map.src : ''
  const alt = typeof map.alt === 'string' ? map.alt : ''
  return {
    src,
    alt,
    size: clampImageFigureSize(map.size),
    align: clampImageFigureAlign(map.align),
    wrap: clampImageFigureWrap(map.wrap),
  }
}

export interface ImageFigureSelection {
  pos: number
  node: ProseMirrorNode
}

export function findImageFigureSelection(
  state: EditorState,
  nodeName: string = EDITOR_OPTIONAL_IMAGE_NODE.name,
): ImageFigureSelection | null {
  const { selection } = state
  const { $from } = selection

  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (node?.type.name === nodeName) {
      const pos = depth > 0 ? $from.before(depth) : 0
      return { pos, node }
    }
  }

  if (selection instanceof NodeSelection && selection.node.type.name === nodeName) {
    return { pos: selection.from, node: selection.node }
  }

  return null
}
