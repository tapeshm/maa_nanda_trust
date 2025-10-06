import type { JSONContent } from '@tiptap/core'

import type { EditorProfile } from '../../frontend/editor/types'
import {
  allowedContainerNodeTypes,
  allowedMarkTypes,
  allowedNodeTypesForProfile,
  baseMarkTypes,
  baseNodeTypes,
  optionalImageAttributes,
  optionalImageNode,
} from './schemaSignature'

type WarnFn = (reason: string, extra?: Record<string, unknown>) => void

export interface EditorRenderContext {
  profile?: EditorProfile | string | null
  slug?: string
  documentId?: string
  origin?: string | null
}

const DEFAULT_PROFILE: EditorProfile = 'basic'
const MEDIA_SRC_PATTERN = /^\/media\/[A-Za-z0-9/_\-.]+$/
const MEDIA_SRC_ABSOLUTE_PATTERN = /^https?:\/\/([^/]+)\/media\/[A-Za-z0-9/_\-.]+$/
const IMAGE_NODE_NAME = optionalImageNode()
const ALLOWED_HEADING_LEVELS = new Set([1, 2, 3, 4, 5, 6])
const SELF_CLOSING_TAGS = new Set(['br', 'hr', 'img'])
const INLINE_TAGS = new Set(['strong', 'em', 's', 'code', 'br'])
// [D3:editor-tiptap.step-12:allow-figure-tags] Add figure and figcaption for imageFigure node
const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code', 'figure', 'figcaption'])
const HTML_ENTITY_PATTERN = /[&<>"']/g
const SCRIPT_TAG_PATTERN = /<script\b/i
const STYLE_ATTRIBUTE_PATTERN = /\sstyle\s*=\s*["']/i
const EVENT_HANDLER_PATTERN = /\son[a-z]+\s*=\s*["']/i
const JAVASCRIPT_PROTOCOL_PATTERN = /javascript:/i

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

function resolveProfile(profile: EditorRenderContext['profile']): EditorProfile {
  return profile === 'full' ? 'full' : DEFAULT_PROFILE
}

function warnWithContext(context: EditorRenderContext, reason: string, extra?: Record<string, unknown>) {
  const payload = {
    event: 'editor.render.warning',
    reason,
    profile: context.profile ?? DEFAULT_PROFILE,
    slug: context.slug,
    documentId: context.documentId,
    ...extra,
  }
  console.warn(payload)
}

function normalizeOriginHost(origin?: string | null): string | null {
  if (!origin || typeof origin !== 'string') {
    return null
  }
  try {
    return new URL(origin).host.toLowerCase()
  } catch {
    return null
  }
}

function isAllowedImageSrc(src: string, origin?: string | null): boolean {
  if (MEDIA_SRC_PATTERN.test(src)) {
    return true
  }
  const match = MEDIA_SRC_ABSOLUTE_PATTERN.exec(src)
  if (!match) {
    return false
  }
  const allowedHost = normalizeOriginHost(origin)
  if (!allowedHost) {
    return false
  }
  return match[1].toLowerCase() === allowedHost
}

function escapeHtml(value: string): string {
  return value.replace(HTML_ENTITY_PATTERN, (entity) => {
    switch (entity) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return entity
    }
  })
}

function escapeAttribute(value: string): string {
  return escapeHtml(value)
}

function sanitizeMarks(marks: unknown, warn: WarnFn, allowedMarks: Set<string>) {
  if (!Array.isArray(marks)) {
    return undefined
  }
  const sanitized = marks
    .map((mark) => {
      if (!mark || typeof mark !== 'object') {
        warn('invalid_mark', { reason: 'not-object' })
        return null
      }
      const type = (mark as any).type
      if (typeof type !== 'string' || !allowedMarks.has(type)) {
        warn('invalid_mark', { type })
        return null
      }
      return { type }
    })
    .filter(Boolean)

  return sanitized.length > 0 ? sanitized : undefined
}

interface SanitizeOptions {
  allowImages: boolean
  warn: WarnFn
  allowedNodes: Set<string>
  containerNodes: Set<string>
  allowedMarks: Set<string>
  origin?: string | null
}

function sanitizeNode(node: any, options: SanitizeOptions): JSONContent | null {
  const { allowImages, warn, allowedNodes, containerNodes, allowedMarks, origin } = options
  if (!node || typeof node !== 'object') {
    warn('invalid_node', { reason: 'not-object' })
    return null
  }

  const type = node.type
  if (typeof type !== 'string') {
    warn('invalid_node', { reason: 'missing-type' })
    return null
  }

  if (!allowedNodes.has(type)) {
    warn('invalid_node', { type })
    return null
  }

  if (type === 'text') {
    const text = typeof node.text === 'string' ? node.text : ''
    const marks = sanitizeMarks(node.marks, warn, allowedMarks)
    return marks ? ({ type: 'text', text, marks } as JSONContent) : ({ type: 'text', text } as JSONContent)
  }

  if (type === 'horizontalRule' || type === 'hardBreak') {
    return { type }
  }

  // [D3:editor-tiptap.step-12:sanitize-image-figure] Handle imageFigure with size/align attrs
  if (type === IMAGE_NODE_NAME) {
    if (!allowImages) {
      warn('images_not_allowed')
      return null
    }
    const attrs = node.attrs || {}
    const src = typeof attrs.src === 'string' ? attrs.src.trim() : ''
    if (!isAllowedImageSrc(src, origin)) {
      warn('image_src_invalid', { src })
      return null
    }
    const alt = typeof attrs.alt === 'string' ? attrs.alt : ''
    const size = ['s', 'm', 'l', 'xl'].includes(attrs.size) ? attrs.size : 'm'
    const align = ['left', 'center', 'right'].includes(attrs.align) ? attrs.align : 'center'

    // imageFigure has inline content (figcaption)
    const contentArray: unknown[] = Array.isArray(node.content) ? node.content : []
    const children = contentArray
      .map((child) => sanitizeNode(child, options))
      .filter((child): child is JSONContent => Boolean(child))

    return {
      type,
      attrs: {
        src,
        alt,
        size,
        align,
      },
      content: children,
    }
  }

  const contentArray: unknown[] = Array.isArray(node.content) ? node.content : []
  const children = contentArray
    .map((child) => sanitizeNode(child, options))
    .filter((child): child is JSONContent => Boolean(child))

  if (containerNodes.has(type) && children.length === 0) {
    warn('container_without_children', { type })
    return null
  }

  if (type === 'heading') {
    const level = typeof node.attrs?.level === 'number' ? node.attrs.level : Number(node.attrs?.level)
    const normalized = ALLOWED_HEADING_LEVELS.has(level) ? level : 2
    return { type, attrs: { level: normalized }, content: children }
  }

  if (type === 'codeBlock') {
    const text = children
      .filter((child) => child.type === 'text')
      .map((child) => (child as any).text || '')
      .join('')
    return { type, attrs: {}, content: [{ type: 'text', text }] }
  }

  return { type, content: children }
}

function sanitizeEditorJson(jsonInput: unknown, context: EditorRenderContext): JSONContent | null {
  if (!jsonInput || typeof jsonInput !== 'object') {
    warnWithContext(context, 'json_invalid_root')
    return null
  }

  const doc = jsonInput as JSONContent
  if (doc.type !== 'doc') {
    warnWithContext(context, 'json_invalid_root_type')
    return null
  }

  const profile = resolveProfile(context.profile)
  const allowImages = profile === 'full'
  const allowedNodes = allowedNodeTypesForProfile(profile)
  const containerNodes = allowedContainerNodeTypes()
  const allowedMarks = allowedMarkTypes()

  const contentArray = Array.isArray(doc.content) ? doc.content : []
  const warn: WarnFn = (reason, extra) => warnWithContext(context, reason, extra)

  const content = contentArray
    .map((node) => sanitizeNode(node, { allowImages, warn, allowedNodes, containerNodes, allowedMarks, origin: context.origin }))
    .filter((node): node is JSONContent => Boolean(node))

  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [{ type: 'text', text: '' }] })
  }

  return { type: 'doc', content }
}

function renderMarks(text: string, marks: { type: string }[] | undefined): string {
  if (!marks || marks.length === 0) {
    return escapeHtml(text)
  }

  return marks.reduce((acc, mark) => {
    switch (mark.type) {
      case 'bold':
        return `<strong>${acc}</strong>`
      case 'italic':
        return `<em>${acc}</em>`
      case 'strike':
        return `<s>${acc}</s>`
      case 'code':
        return `<code>${acc}</code>`
      default:
        return acc
    }
  }, escapeHtml(text))
}

function renderInline(content: JSONContent['content'] | undefined): string {
  if (!content) {
    return ''
  }

  return content
    .map((node) => {
      if (node.type === 'text') {
        return renderMarks((node as any).text || '', (node as any).marks)
      }
      if (node.type === 'hardBreak') {
        return '<br />'
      }
      // [D3:editor-tiptap.step-12:remove-inline-image] imageFigure is now a block node, handled in renderNodes
      return ''
    })
    .join('')
}

function renderNodes(content: JSONContent['content'] | undefined, profile: EditorProfile): string {
  if (!content) {
    return ''
  }

  return content
    .map((node) => {
      switch (node.type) {
        case 'paragraph':
          return `<p>${renderInline(node.content)}</p>`
        case 'heading': {
          const level = ALLOWED_HEADING_LEVELS.has((node as any).attrs?.level)
            ? (node as any).attrs.level
            : 2
          return `<h${level}>${renderInline(node.content)}</h${level}>`
        }
        case 'blockquote':
          return `<blockquote>${renderNodes(node.content, profile)}</blockquote>`
        case 'bulletList':
          return `<ul>${renderNodes(node.content, profile)}</ul>`
        case 'orderedList':
          return `<ol>${renderNodes(node.content, profile)}</ol>`
        case 'listItem':
          return `<li>${renderNodes(node.content, profile)}</li>`
        case 'codeBlock': {
          const text = (node.content ?? [])
            .filter((child) => child.type === 'text')
            .map((child) => (child as any).text || '')
            .join('\n')
          return `<pre><code>${escapeHtml(text)}</code></pre>`
        }
        case 'horizontalRule':
          return '<hr />'
        case 'text':
          return renderMarks((node as any).text || '', (node as any).marks)
        case 'hardBreak':
          return '<br />'
        case 'doc':
          return renderNodes(node.content, profile)
        // [D3:editor-tiptap.step-12:render-image-figure] Render imageFigure as figure/img/figcaption
        case IMAGE_NODE_NAME:
          if (profile !== 'full') {
            return ''
          }
          {
            const attrs = (node as any).attrs || {}
            const src = attrs.src || ''
            const alt = attrs.alt || ''
            const size = attrs.size || 'm'
            const align = attrs.align || 'center'
            const sizeClass = `editor-figure--size-${size}`
            const alignClass = `editor-figure--align-${align}`
            const caption = renderInline(node.content)
            const figcaption = caption.trim().length > 0 ? `<figcaption class="editor-figcaption">${caption}</figcaption>` : ''
            return `<figure class="editor-figure ${sizeClass} ${alignClass}"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" class="editor-image" loading="lazy" decoding="async" />${figcaption}</figure>`
          }
        default:
          return ''
      }
    })
    .join('')
}

function renderHtmlFromSanitizedDoc(doc: JSONContent, context: EditorRenderContext): string {
  const profile = resolveProfile(context.profile)
  return renderNodes(doc.content, profile)
}

function sanitizeHtmlAttributes(tag: string, attributes: string, context: EditorRenderContext, warn: WarnFn): boolean {
  if (STYLE_ATTRIBUTE_PATTERN.test(attributes) || EVENT_HANDLER_PATTERN.test(attributes)) {
    warn('html_forbidden_attribute', { tag })
    return false
  }

  if (tag === 'img') {
    const attrPattern = /(\w[\w-]*)\s*=\s*("[^"]*"|'[^']*')/g
    const allowedAttrs = new Set(optionalImageAttributes())
    allowedAttrs.add('loading')
    allowedAttrs.add('decoding')
    let match: RegExpExecArray | null
    let src: string | null = null

    while ((match = attrPattern.exec(attributes)) !== null) {
      const attrName = match[1]
      const attrValue = match[2].slice(1, -1)
      if (!allowedAttrs.has(attrName)) {
        warn('html_forbidden_attribute', { tag, attr: attrName })
        return false
      }
      if (attrName === 'src') {
        src = attrValue
      }
      if (JAVASCRIPT_PROTOCOL_PATTERN.test(attrValue)) {
        warn('html_javascript_protocol', { tag, attr: attrName })
        return false
      }
    }

    if (!src || !isAllowedImageSrc(src, context.origin)) {
      warn('html_image_src_invalid', { src })
      return false
    }
  } else if (JAVASCRIPT_PROTOCOL_PATTERN.test(attributes)) {
    warn('html_javascript_protocol', { tag })
    return false
  }

  return true
}

export function isSafeEditorHtml(html: string, context: EditorRenderContext = {}): boolean {
  const warn: WarnFn = (reason, extra) => warnWithContext(context, reason, extra)
  if (SCRIPT_TAG_PATTERN.test(html)) {
    warn('html_script_tag')
    return false
  }
  if (STYLE_ATTRIBUTE_PATTERN.test(html)) {
    warn('html_style_attribute')
    return false
  }
  if (EVENT_HANDLER_PATTERN.test(html)) {
    warn('html_event_handler_attribute')
    return false
  }

  const tagPattern = /<\/?([a-z0-9]+)([^>]*)>/gi
  let match: RegExpExecArray | null
  const stack: string[] = []

  while ((match = tagPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const rawAttrs = match[2] || ''

    if (!INLINE_TAGS.has(tag) && !BLOCK_TAGS.has(tag) && !SELF_CLOSING_TAGS.has(tag)) {
      warn('html_unexpected_tag', { tag })
      return false
    }

    const isClosing = match[0][1] === '/'
    const selfClosing = SELF_CLOSING_TAGS.has(tag) || /\/$/.test(match[0])

    if (!isClosing && !selfClosing) {
      stack.push(tag)
    } else if (isClosing) {
      const last = stack.pop()
      if (last !== tag) {
        warn('html_mismatched_tag', { expected: last, received: tag })
        return false
      }
      continue
    }

    if (rawAttrs && !sanitizeHtmlAttributes(tag, rawAttrs, context, warn)) {
      return false
    }
  }

  if (stack.length > 0) {
    warn('html_unclosed_tag', { tag: stack.pop() })
    return false
  }

  return true
}

export function renderFallbackHtml(jsonInput: unknown, context: EditorRenderContext = {}): string {
  const sanitized = sanitizeEditorJson(jsonInput, context)
  if (!sanitized) {
    return '<p></p>'
  }
  return renderHtmlFromSanitizedDoc(sanitized, context)
}

export function selectRenderedHtml(
  jsonInput: unknown,
  storedHtml: string | null | undefined,
  context: EditorRenderContext = {},
): { html: string; fromStored: boolean } {
  if (storedHtml && isSafeEditorHtml(storedHtml, context)) {
    return { html: storedHtml, fromStored: true }
  }

  if (storedHtml) {
    warnWithContext(context, 'stored_html_invalid')
  }

  return {
    html: renderFallbackHtml(jsonInput, context),
    fromStored: false,
  }
}

export function wrapWithProse(html: string, className: string): string {
  return `<article class="${className}">${html}</article>`
}

export { EMPTY_DOC as EMPTY_EDITOR_DOC, MEDIA_SRC_PATTERN, baseNodeTypes, baseMarkTypes }
