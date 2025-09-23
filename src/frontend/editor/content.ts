/**
 * SSR content loader for editor hydration.
 *
 * Looks for a sibling <script type="application/json"> tag keyed by the editor root id.
 * Convention: the payload script id is `${root.id}__content`.
 */
// [D3:editor-tiptap.step-03:loader]
import type { JSONContent } from './types'

export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

function safeParseJSON(text: string | null | undefined): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function isDocShape(value: unknown): value is JSONContent {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  if (obj.type !== 'doc') return false
  if (!Array.isArray(obj.content)) return false
  // Require at least one block to satisfy the default schema (block+)
  return obj.content.length > 0
}

export function findPayloadScript(root: HTMLElement): HTMLScriptElement | null {
  const id = root.id?.trim()
  if (!id) return null
  const el = (document.getElementById(`${id}__content`) || null) as HTMLScriptElement | null
  if (el && el.tagName === 'SCRIPT' && (el as HTMLScriptElement).type === 'application/json') {
    return el as HTMLScriptElement
  }
  return null
}

export function readInitialContent(root: HTMLElement): JSONContent {
  const script = findPayloadScript(root)
  const data = safeParseJSON(script?.textContent)
  if (isDocShape(data)) {
    return data
  }
  return EMPTY_DOC
}
