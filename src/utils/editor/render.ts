import type { JSONContent } from '@tiptap/core'

import type { EditorProfile } from '../../frontend/editor/types'
import {
  DEFAULT_EDITOR_PROFILE,
  isFullEditorProfile,
  resolveEditorProfile as resolveEditorProfileValue,
} from '../../editor/constants'
import {
  allowedContainerNodeTypes,
  allowedMarkTypes,
  allowedNodeTypesForProfile,
  baseMarkTypes,
  baseNodeTypes,
  optionalImageAttributes,
  optionalImageNode,
} from './schemaSignature'
import { normalizeLinkHref } from './linkValidation'

type WarnFn = (reason: string, extra?: Record<string, unknown>) => void

export interface EditorRenderContext {
  profile?: EditorProfile | string | null
  slug?: string
  documentId?: string
  origin?: string | null
}

const MEDIA_SRC_PATTERN = /^\/media\/[A-Za-z0-9/_\-.]+$/
const MEDIA_SRC_ABSOLUTE_PATTERN = /^https?:\/\/([^/]+)\/media\/[A-Za-z0-9/_\-.]+$/
const IMAGE_NODE_NAME = optionalImageNode()
const ALLOWED_HEADING_LEVELS = new Set([1, 2, 3, 4, 5, 6])
const SELF_CLOSING_TAGS = new Set(['br', 'hr', 'img'])
const INLINE_TAGS = new Set(['strong', 'em', 's', 'code', 'br', 'a'])
// [D3:editor-tiptap.step-12:allow-figure-tags] Add figure and figcaption for imageFigure node
const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code', 'figure', 'figcaption'])
const HTML_ENTITY_PATTERN = /[&<>"']/g
const EMPTY_PARAGRAPH_PATTERN = /<p(\s[^>]*)?>\s*<\/p>/gi
const SCRIPT_TAG_PATTERN = /<script\b/i
const STYLE_ATTRIBUTE_PATTERN = /\sstyle\s*=\s*["']/i
const EVENT_HANDLER_PATTERN = /\son[a-z]+\s*=\s*["']/i
const JAVASCRIPT_PROTOCOL_PATTERN = /javascript:/i

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

type SanitizedMark = {
  type: string
  attrs?: Record<string, string>
}

function resolveProfile(profile: EditorRenderContext['profile']): EditorProfile {
  if (typeof profile === 'string') {
    return resolveEditorProfileValue(profile)
  }
  return DEFAULT_EDITOR_PROFILE
}

function warnWithContext(context: EditorRenderContext, reason: string, extra?: Record<string, unknown>) {
  const payload = {
    event: 'editor.render.warning',
    reason,
    profile: context.profile ?? DEFAULT_EDITOR_PROFILE,
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

function sanitizeMarks(
  marks: unknown,
  warn: WarnFn,
  allowedMarks: Set<string>,
  origin?: string | null,
): SanitizedMark[] | undefined {
  if (!Array.isArray(marks)) {
    return undefined
  }

  void origin

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
      if (type === 'link') {
        return sanitizeLinkMark(mark, warn)
      }
      return { type }
    })
    .filter(Boolean)

  return sanitized.length > 0 ? (sanitized as SanitizedMark[]) : undefined
}

function sanitizeLinkMark(mark: any, warn: WarnFn): SanitizedMark | null {
  const attrs = mark?.attrs ?? {}
  const normalized = normalizeLinkHref(attrs.href)
  if (!normalized) {
    warn('invalid_link', { reason: 'href', value: attrs.href })
    return null
  }

  const resultAttrs: Record<string, string> = {
    href: normalized.href,
  }

  const target = typeof attrs.target === 'string' ? attrs.target.trim().toLowerCase() : ''
  if (target === '_blank') {
    resultAttrs.target = '_blank'
    const rel = typeof attrs.rel === 'string' ? attrs.rel : ''
    const tokens = new Set(rel.split(/\s+/).filter(Boolean))
    tokens.add('noopener')
    tokens.add('noreferrer')
    resultAttrs.rel = Array.from(tokens).join(' ')
  }

  const title = typeof attrs.title === 'string' ? attrs.title.trim() : ''
  if (title) {
    resultAttrs.title = title
  }

  return { type: 'link', attrs: resultAttrs }
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
    const marks = sanitizeMarks(node.marks, warn, allowedMarks, origin)
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
    const wrap = attrs.wrap === 'break' ? 'break' : 'text'

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
        wrap,
      },
      content: children,
    }
  }

  const contentArray: unknown[] = Array.isArray(node.content) ? node.content : []
  const children = contentArray
    .map((child) => sanitizeNode(child, options))
    .filter((child): child is JSONContent => Boolean(child))

  if (containerNodes.has(type) && children.length === 0) {
    if (type === 'paragraph') {
      return { type, content: [{ type: 'hardBreak' }] }
    }
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
  if (typeof jsonInput === 'string') {
    try {
      jsonInput = JSON.parse(jsonInput) as JSONContent
    } catch {
      warnWithContext(context, 'json_invalid_parse')
      return null
    }
  }

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
  const allowImages = isFullEditorProfile(profile)
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

function renderMarks(text: string, marks: SanitizedMark[] | undefined): string {
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
      case 'link': {
        const href = mark.attrs?.href
        if (!href) {
          return acc
        }
        const attributes: string[] = [`href="${escapeAttribute(href)}"`]
        if (mark.attrs?.target === '_blank') {
          attributes.push('target="_blank"')
          const rel =
            mark.attrs.rel && mark.attrs.rel.includes('noopener') && mark.attrs.rel.includes('noreferrer')
              ? mark.attrs.rel
              : 'noopener noreferrer'
          attributes.push(`rel="${escapeAttribute(rel)}"`)
        } else if (mark.attrs?.rel) {
          attributes.push(`rel="${escapeAttribute(mark.attrs.rel)}"`)
        }
        if (mark.attrs?.title) {
          attributes.push(`title="${escapeAttribute(mark.attrs.title)}"`)
        }
        return `<a ${attributes.join(' ')}>${acc}</a>`
      }
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
          if (!isFullEditorProfile(profile)) {
            return ''
          }
          {
            const attrs = (node as any).attrs || {}
            const src = attrs.src || ''
            const alt = attrs.alt || ''
            const size = attrs.size || 'm'
            const align = attrs.align || 'center'
            const wrap = attrs.wrap === 'break' ? 'break' : 'text'
            const sizeClass = `editor-figure--size-${size}`
            const alignClass = `editor-figure--align-${align}`
            const wrapClass = wrap === 'break' ? 'editor-figure--wrap-break' : 'editor-figure--wrap-text'
            const caption = renderInline(node.content)
            const figcaption = `<figcaption class="editor-figcaption">${caption}</figcaption>`
            return `<figure class="editor-figure ${sizeClass} ${alignClass} ${wrapClass}"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" class="editor-image" loading="lazy" decoding="async" />${figcaption}</figure>`
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

export function normalizeEditorHtmlWhitespace(html: string): string {
  return html.replace(EMPTY_PARAGRAPH_PATTERN, (_, attrs = '') => {
    const trimmed = attrs.trim()
    const suffix = trimmed.length > 0 ? ` ${trimmed}` : ''
    return `<p${suffix}><br /></p>`
  })
}

function sanitizeHtmlAttributes(tag: string, attributes: string, context: EditorRenderContext, warn: WarnFn): boolean {
  if (STYLE_ATTRIBUTE_PATTERN.test(attributes) || EVENT_HANDLER_PATTERN.test(attributes)) {
    warn('html_forbidden_attribute', { tag })
    return false
  }

  if (tag === 'a') {
    const attrPattern = /(\w[\w-]*)\s*=\s*("[^"]*"|'[^']*')/g
    const allowedAttrs = new Set(['href', 'target', 'rel', 'title', 'class'])
    let match: RegExpExecArray | null
    let href: string | null = null
    let target: string | null = null
    let rel: string | null = null

    while ((match = attrPattern.exec(attributes)) !== null) {
      const attrName = match[1]
      const attrValue = match[2].slice(1, -1)

      if (
        !allowedAttrs.has(attrName) &&
        !attrName.startsWith('data-') &&
        !attrName.startsWith('aria-')
      ) {
        warn('html_forbidden_attribute', { tag, attr: attrName })
        return false
      }

      if (JAVASCRIPT_PROTOCOL_PATTERN.test(attrValue)) {
        warn('html_javascript_protocol', { tag, attr: attrName })
        return false
      }

      if (attrName === 'href') {
        const normalized = normalizeLinkHref(attrValue)
        if (!normalized) {
          warn('html_link_href_invalid', { href: attrValue })
          return false
        }
        href = normalized.href
      } else if (attrName === 'target') {
        const normalizedTarget = attrValue.toLowerCase()
        if (normalizedTarget !== '_blank' && normalizedTarget !== '_self') {
          warn('html_link_target_invalid', { target: attrValue })
          return false
        }
        target = normalizedTarget
      } else if (attrName === 'rel') {
        rel = attrValue
      }
    }

    if (!href) {
      warn('html_link_href_missing')
      return false
    }

    if (target === '_blank') {
      const relTokens = new Set((rel ?? '').split(/\s+/).filter(Boolean))
      if (!relTokens.has('noopener') || !relTokens.has('noreferrer')) {
        warn('html_link_rel_missing', { rel })
        return false
      }
    }

    return true
  }

  if (tag === 'img') {
    const attrPattern = /(\w[\w-]*)\s*=\s*("[^"]*"|'[^']*')/g
    const allowedAttrs = new Set(optionalImageAttributes())
    allowedAttrs.add('class')
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
    return '<p><br /></p>'
  }
  const rendered = renderHtmlFromSanitizedDoc(sanitized, context)
  return normalizeEditorHtmlWhitespace(rendered)
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
