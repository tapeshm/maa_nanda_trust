import type { EditorProfile } from '../../frontend/editor/types'
import { IMAGE_FIGURE_NODE_NAME } from './extensions/imageFigure'

const DOCUMENT_NODES = ['doc'] as const
const TEXT_NODES = ['text'] as const
const BLOCK_NODES = [
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'codeBlock',
] as const
const LEAF_NODES = ['hardBreak', 'horizontalRule'] as const

const OPTIONAL_IMAGE_FIGURE_NODE = {
  name: IMAGE_FIGURE_NODE_NAME,
  attrs: ['src', 'alt', 'width', 'height', 'size', 'align', 'captionId'] as const,
}

const BASE_MARK_TYPES = ['bold', 'italic', 'strike', 'code'] as const

const BASIC_NODE_SET = new Set<string>([
  ...DOCUMENT_NODES,
  ...TEXT_NODES,
  ...BLOCK_NODES,
  ...LEAF_NODES,
])

const FULL_NODE_SET = new Set<string>([...BASIC_NODE_SET, OPTIONAL_IMAGE_FIGURE_NODE.name])

const CONTAINER_NODE_SET = new Set<string>([...DOCUMENT_NODES, ...BLOCK_NODES])

const MARK_TYPE_SET = new Set<string>(BASE_MARK_TYPES)

export const schemaSignature = {
  nodes: {
    document: DOCUMENT_NODES,
    text: TEXT_NODES,
    block: BLOCK_NODES,
    leaf: LEAF_NODES,
    optional: {
      imageFigure: OPTIONAL_IMAGE_FIGURE_NODE,
    },
  },
  marks: BASE_MARK_TYPES,
} as const

const BASE_NODE_TYPES: string[] = [
  ...DOCUMENT_NODES,
  ...TEXT_NODES,
  ...BLOCK_NODES,
  ...LEAF_NODES,
]

export function allowedNodeTypesForProfile(profile: EditorProfile): Set<string> {
  return profile === 'full' ? FULL_NODE_SET : BASIC_NODE_SET
}

export function allowedContainerNodeTypes(): Set<string> {
  return CONTAINER_NODE_SET
}

export function allowedMarkTypes(): Set<string> {
  return MARK_TYPE_SET
}

export function baseNodeTypes(): string[] {
  return [...BASE_NODE_TYPES]
}

export function optionalImageNode(): string {
  return schemaSignature.nodes.optional.imageFigure.name
}

export function optionalImageFigureAttributes(): readonly string[] {
  return schemaSignature.nodes.optional.imageFigure.attrs
}

export function baseMarkTypes(): string[] {
  return [...BASE_MARK_TYPES]
}
