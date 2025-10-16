import type { EditorProfile } from '../../frontend/editor/types'
import {
  EDITOR_BASE_MARK_TYPES,
  EDITOR_BLOCK_NODES,
  EDITOR_DOCUMENT_NODES,
  EDITOR_LEAF_NODES,
  EDITOR_OPTIONAL_IMAGE_NODE,
  EDITOR_TEXT_NODES,
  isFullEditorProfile,
} from '../../editor/constants'

const BASIC_NODE_SET = new Set<string>([
  ...EDITOR_DOCUMENT_NODES,
  ...EDITOR_TEXT_NODES,
  ...EDITOR_BLOCK_NODES,
  ...EDITOR_LEAF_NODES,
])

const FULL_NODE_SET = new Set<string>([...BASIC_NODE_SET, EDITOR_OPTIONAL_IMAGE_NODE.name])

const CONTAINER_NODE_SET = new Set<string>([
  ...EDITOR_DOCUMENT_NODES,
  ...EDITOR_BLOCK_NODES,
])

const MARK_TYPE_SET = new Set<string>(EDITOR_BASE_MARK_TYPES)

export const schemaSignature = {
  nodes: {
    document: EDITOR_DOCUMENT_NODES,
    text: EDITOR_TEXT_NODES,
    block: EDITOR_BLOCK_NODES,
    leaf: EDITOR_LEAF_NODES,
    optional: {
      image: EDITOR_OPTIONAL_IMAGE_NODE,
    },
  },
  marks: EDITOR_BASE_MARK_TYPES,
} as const

const BASE_NODE_TYPES: string[] = [
  ...EDITOR_DOCUMENT_NODES,
  ...EDITOR_TEXT_NODES,
  ...EDITOR_BLOCK_NODES,
  ...EDITOR_LEAF_NODES,
]

export function allowedNodeTypesForProfile(profile: EditorProfile): Set<string> {
  return isFullEditorProfile(profile) ? FULL_NODE_SET : BASIC_NODE_SET
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
  return schemaSignature.nodes.optional.image.name
}

export function optionalImageAttributes(): readonly string[] {
  return schemaSignature.nodes.optional.image.attrs
}

export function baseMarkTypes(): string[] {
  return [...EDITOR_BASE_MARK_TYPES]
}
