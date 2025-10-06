import type { JSONContent } from '@tiptap/core'

import type { EditorProfile } from '../../frontend/editor/types'
import {
  allowedContainerNodeTypes,
  allowedMarkTypes,
  allowedNodeTypesForProfile,
} from './schemaSignature'
import {
  IMAGE_FIGURE_ALIGNS,
  IMAGE_FIGURE_NODE_NAME,
  IMAGE_FIGURE_SIZES,
  ensureCaptionId,
  normalizeImageFigureAttrs,
  type ImageFigureAlign,
  type ImageFigureAttrs,
  type ImageFigureSize,
} from './extensions/imageFigure'

const DEFAULT_PROFILE: EditorProfile = 'basic'
const MEDIA_SRC_RELATIVE_PATTERN = /^\/media\/[A-Za-z0-9/_\-.]+$/
const MEDIA_SRC_ABSOLUTE_PATTERN = /^https?:\/\/([^/]+)\/media\/[A-Za-z0-9/_\-.]+$/
const MEDIA_SRC_PATTERN = MEDIA_SRC_RELATIVE_PATTERN
const STYLE_ATTRIBUTE_PATTERN = /\sstyle\s*=\s*["']/i
const CAPTION_ID_PATTERN = /^imgcap-[A-Za-z0-9_-]{8,22}$/

const HEADING_TAGS = Array.from({ length: 6 }, (_, index) => `h${index + 1}`)
const BLOCK_TAGS = ['p', 'blockquote', 'ul', 'ol', 'li', 'pre']
const INLINE_TAGS = ['strong', 'em', 's', 'code', 'br']
const SELF_CLOSING_TAGS = ['hr']
const FIGURE_TAGS = ['figure', 'figcaption']
const MEDIA_TAGS = ['img']

const ALLOWED_HTML_TAGS = new Set<string>([
  ...HEADING_TAGS,
  ...BLOCK_TAGS,
  ...INLINE_TAGS,
  ...SELF_CLOSING_TAGS,
  ...FIGURE_TAGS,
  ...MEDIA_TAGS,
])

const CAPTION_ALLOWED_MARKS = new Set(['bold', 'italic', 'code'])
const ALLOWED_IMAGE_ATTRIBUTES = new Set([
  'src',
  'alt',
  'width',
  'height',
  'loading',
  'decoding',
  'class',
  'aria-describedby',
])
const ALLOWED_FIGCAPTION_ATTRIBUTES = new Set(['class', 'id'])
const ALLOWED_FIGCAPTION_TAGS = new Set(['strong', 'em', 'code', 'br'])

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

export interface EditorRenderContext {
  profile?: EditorProfile | string | null
  slug?: string
  documentId?: string
  origin?: string | null
}

type WarnFn = (reason: string, extra?: Record<string, unknown>) => void

function resolveProfile(input: EditorRenderContext['profile']): EditorProfile {
  return input === 'full' ? 'full' : DEFAULT_PROFILE
}

function normalizeOriginHost(origin?: string | null): string | null {
  if (!origin || typeof origin !== 'string') {
    return null
  }
  try {
    const url = new URL(origin)
    return url.host.toLowerCase()
  } catch {
    return null
  }
}

function isAllowedMediaSrc(src: string, origin?: string | null): boolean {
  if (MEDIA_SRC_RELATIVE_PATTERN.test(src)) {
    return true
  }
  const match = MEDIA_SRC_ABSOLUTE_PATTERN.exec(src)
  if (!match) {
    return false
  }
  const host = match[1].toLowerCase()
  const reference = normalizeOriginHost(origin)
  if (!reference) {
    return false
  }
  return host === reference
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

function sanitizeMarks(marks: unknown, warn: WarnFn, allowedMarks: Set<string>) {
  if (!Array.isArray(marks)) return undefined
  const cleaned = marks
    .map((mark) => {
      if (!mark || typeof mark !== 'object') {
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
  return cleaned.length > 0 ? cleaned : undefined
}

function sanitizeCaptionNodes(nodes: unknown, warn: WarnFn): JSONContent['content'] {
  if (!Array.isArray(nodes)) {
    return []
  }
  const sanitized: JSONContent['content'] = []
  nodes.forEach((node) => {
    if (!node || typeof node !== 'object') {
      warn('figure_caption_invalid_node', { reason: 'not-object' })
      return
    }
    const type = (node as any).type
    if (type === 'text') {
      const text = typeof (node as any).text === 'string' ? (node as any).text : ''
      const marks = sanitizeMarks((node as any).marks, warn, CAPTION_ALLOWED_MARKS)
      sanitized.push(marks ? ({ type: 'text', text, marks } as JSONContent) : ({ type: 'text', text } as JSONContent))
      return
    }
    if (type === 'hardBreak') {
      sanitized.push({ type: 'hardBreak' })
      return
    }
    warn('figure_caption_invalid_node', { type })
  })
  return sanitized
}

interface SanitizeOptions {
  allowImages: boolean
  warn: WarnFn
  allowedNodes: Set<string>
  containerNodes: Set<string>
  allowedMarks: Set<string>
  origin?: string | null
}

function sanitizeNodes(nodes: unknown[], options: SanitizeOptions): JSONContent['content'] {
  const sanitized: JSONContent['content'] = []
  nodes.forEach((node) => {
    const clean = sanitizeNode(node, options)
    if (clean) {
      sanitized.push(clean)
    }
  })
  return sanitized
}

function sanitizeNode(node: unknown, options: SanitizeOptions): JSONContent | null {
  const { allowImages, warn, allowedNodes, containerNodes, allowedMarks } = options
  if (!node || typeof node !== 'object') {
    warn('invalid_node', { reason: 'not-object' })
    return null
  }

  const type = (node as any).type
  if (typeof type !== 'string') {
    warn('invalid_node', { reason: 'missing-type' })
    return null
  }

  if (type === 'text') {
    const text = typeof (node as any).text === 'string' ? (node as any).text : ''
    const marks = sanitizeMarks((node as any).marks, warn, allowedMarks)
    return marks ? ({ type: 'text', text, marks } as JSONContent) : ({ type: 'text', text } as JSONContent)
  }

  if (type === 'horizontalRule' || type === 'hardBreak') {
    return { type }
  }

  if (type === IMAGE_FIGURE_NODE_NAME || type === 'image') {
    if (!allowImages || !allowedNodes.has(IMAGE_FIGURE_NODE_NAME)) {
      warn('image_disallowed_for_profile')
      return null
    }

    const rawAttrs = ((node as any).attrs ?? {}) as Partial<ImageFigureAttrs>
    const normalized = normalizeImageFigureAttrs({
      src: rawAttrs.src,
      alt: rawAttrs.alt ?? '',
      width: rawAttrs.width ?? null,
      height: rawAttrs.height ?? null,
      size: rawAttrs.size ?? 'medium',
      align: rawAttrs.align ?? 'center',
      captionId: rawAttrs.captionId ?? ensureCaptionId(null),
    })

    if (!normalized) {
      warn('invalid_image_src', { src: rawAttrs.src ?? '' })
      return null
    }

    if (!isAllowedMediaSrc(normalized.src, options.origin)) {
      warn('invalid_image_src', { src: normalized.src })
      return null
    }

    const content = type === IMAGE_FIGURE_NODE_NAME
      ? sanitizeCaptionNodes((node as any).content, warn)
      : []

    return {
      type: IMAGE_FIGURE_NODE_NAME,
      attrs: normalized,
      content,
    }
  }

  if (!allowedNodes.has(type)) {
    warn('invalid_node_type', { type })
    return null
  }

  if (!containerNodes.has(type)) {
    warn('invalid_node_type', { type })
    return null
  }

  const children = Array.isArray((node as any).content)
    ? sanitizeNodes((node as any).content, options)
    : []

  if (type === 'heading') {
    const level = Number((node as any).attrs?.level)
    const safeLevel = Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2
    if (safeLevel !== level) {
      warn('invalid_heading_level', { level })
    }
    return { type: 'heading', attrs: { level: safeLevel }, content: children }
  }

  if (type === 'codeBlock') {
    return { type: 'codeBlock', content: children }
  }

  return { type, content: children }
}

function sanitizeDocument(input: unknown, options: SanitizeOptions): JSONContent | null {
  const { warn } = options
  if (!input || typeof input !== 'object') {
    warn('invalid_document', { reason: 'not-object' })
    return null
  }
  if ((input as any).type !== 'doc' || !Array.isArray((input as any).content)) {
    warn('invalid_document', { reason: 'unexpected-shape' })
    return null
  }
  return { type: 'doc', content: sanitizeNodes((input as any).content, options) }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function applyMarks(text: string, marks?: Array<{ type: string }>): string {
  if (!marks || marks.length === 0) {
    return text
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
  }, text)
}

function applyCaptionMarks(text: string, marks?: Array<{ type: string }>): string {
  if (!marks || marks.length === 0) {
    return text
  }
  return marks.reduce((acc, mark) => {
    switch (mark.type) {
      case 'bold':
        return `<strong>${acc}</strong>`
      case 'italic':
        return `<em>${acc}</em>`
      case 'code':
        return `<code>${acc}</code>`
      default:
        return acc
    }
  }, text)
}

function figureClassName(attrs: ImageFigureAttrs): string {
  const classes = new Set<string>()
  classes.add('editor-figure')
  classes.add(`editor-figure--size-${attrs.size}`)
  classes.add(`editor-figure--align-${attrs.align}`)
  return Array.from(classes).join(' ')
}

function captionHasContent(content: JSONContent['content']): boolean {
  if (!Array.isArray(content)) {
    return false
  }
  return content.some((node) => {
    if (!node) return false
    if (node.type === 'text') {
      return typeof node.text === 'string' && node.text.trim().length > 0
    }
    if (node.type === 'hardBreak') {
      return true
    }
    return false
  })
}

function renderCaption(content: JSONContent['content']): string {
  if (!Array.isArray(content) || content.length === 0) {
    return ''
  }
  return content
    .map((node) => {
      if (node.type === 'text') {
        const text = escapeHtml(node.text ?? '')
        return applyCaptionMarks(text, node.marks as Array<{ type: string }> | undefined)
      }
      if (node.type === 'hardBreak') {
        return '<br />'
      }
      return ''
    })
    .join('')
}

function renderNodes(nodes: JSONContent['content'], allowImages: boolean): string {
  if (!Array.isArray(nodes)) return ''
  return nodes.map((node) => renderNode(node, allowImages)).join('')
}

function renderNode(node: JSONContent, allowImages: boolean): string {
  switch (node.type) {
    case 'text':
      return applyMarks(escapeHtml(node.text ?? ''), node.marks as Array<{ type: string }> | undefined)
    case 'paragraph':
      return `<p>${renderNodes(node.content, allowImages)}</p>`
    case 'heading': {
      const level = Number(node.attrs?.level) || 1
      const safeLevel = Math.min(Math.max(level, 1), 6)
      return `<h${safeLevel}>${renderNodes(node.content, allowImages)}</h${safeLevel}>`
    }
    case 'blockquote':
      return `<blockquote>${renderNodes(node.content, allowImages)}</blockquote>`
    case 'bulletList':
      return `<ul>${renderNodes(node.content, allowImages)}</ul>`
    case 'orderedList':
      return `<ol>${renderNodes(node.content, allowImages)}</ol>`
    case 'listItem':
      return `<li>${renderNodes(node.content, allowImages)}</li>`
    case 'codeBlock':
      return `<pre><code>${renderNodes(node.content, allowImages)}</code></pre>`
    case 'horizontalRule':
      return '<hr />'
    case 'hardBreak':
      return '<br />'
    case IMAGE_FIGURE_NODE_NAME: {
      if (!allowImages) {
        return ''
      }
      const attrs = normalizeImageFigureAttrs(node.attrs as ImageFigureAttrs)
      if (!attrs) {
        return ''
      }
      const captionContent = Array.isArray(node.content) ? (node.content as JSONContent['content']) : []
      const captionHtml = renderCaption(captionContent)
      const hasCaption = captionHasContent(captionContent)
      const imgAttributes = [
        'class="editor-image"',
        `src="${escapeHtml(attrs.src)}"`,
        `alt="${escapeHtml(attrs.alt)}"`,
        'loading="lazy"',
        'decoding="async"',
      ]
      if (typeof attrs.width === 'number') {
        imgAttributes.push(`width="${attrs.width}"`)
      }
      if (typeof attrs.height === 'number') {
        imgAttributes.push(`height="${attrs.height}"`)
      }
      if (hasCaption) {
        imgAttributes.push(`aria-describedby="${attrs.captionId}"`)
      }

      const figcaptionAttributes = [`class="editor-figcaption"`, `id="${attrs.captionId}"`]
      return `<figure class="${figureClassName(attrs)}"><img ${imgAttributes.join(' ')} /><figcaption ${figcaptionAttributes.join(' ')}>${captionHtml}</figcaption></figure>`
    }
    default:
      return ''
  }
}

export function sanitizeEditorJson(
  input: unknown,
  context: EditorRenderContext = {},
): JSONContent | null {
  const profile = resolveProfile(context.profile)
  const warn = (reason: string, extra?: Record<string, unknown>) => warnWithContext(context, reason, extra)
  const allowedNodes = allowedNodeTypesForProfile(profile)
  const containerNodes = allowedContainerNodeTypes()
  const allowedMarks = allowedMarkTypes()

  let payload = input
  if (typeof input === 'string') {
    try {
      payload = JSON.parse(input) as unknown
    } catch (error) {
      warn('json_parse_failed', { error: (error as Error)?.message ?? 'parse_error' })
      return null
    }
  }

  return sanitizeDocument(payload, {
    allowImages: profile === 'full',
    warn,
    allowedNodes,
    containerNodes,
    allowedMarks,
    origin: context.origin ?? null,
  })
}

export function renderHtmlFromSanitizedDoc(doc: JSONContent, context: EditorRenderContext = {}): string {
  const allowImages = resolveProfile(context.profile) === 'full'
  return renderNodes(doc.content ?? [], allowImages) || '<p></p>'
}

export function renderFallbackHtml(
  input: unknown,
  context: EditorRenderContext = {},
): string {
  // Cloudflare Workers cannot rely on @tiptap/html (DOM APIs are unavailable),
  // so this fallback renderer must remain in lockstep with extensionsList(profile).
  const sanitized = sanitizeEditorJson(input, context)
  if (!sanitized) {
    return '<p></p>'
  }
  return renderHtmlFromSanitizedDoc(sanitized, context)
}

function parseAttributes(source: string): Record<string, string> | null {
  const attrs: Record<string, string> = {}
  const attrPattern = /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g
  let match: RegExpExecArray | null
  while ((match = attrPattern.exec(source)) !== null) {
    const name = match[1].toLowerCase()
    const value = match[3] ?? match[4] ?? ''
    attrs[name] = value
  }
  const leftover = source.replace(attrPattern, '').trim()
  if (leftover === '' || leftover === '/' || leftover === '/>') {
    return attrs
  }
  if (leftover.length > 0) {
    return null
  }
  return attrs
}

function validateImageAttributes(
  attrs: Record<string, string>,
  context: EditorRenderContext,
  warn: WarnFn,
): boolean {
  const names = Object.keys(attrs)
  if (names.length === 0) {
    warn('html_image_missing_attributes')
    return false
  }
  for (const name of names) {
    if (!ALLOWED_IMAGE_ATTRIBUTES.has(name)) {
      warn('html_image_invalid_attribute', { attribute: name })
      return false
    }
  }

  const classTokens = (attrs.class ?? '').split(/\s+/).filter(Boolean)
  if (!classTokens.includes('editor-image')) {
    warn('html_image_missing_class')
    return false
  }
  if (classTokens.some((token) => token !== 'editor-image')) {
    warn('html_image_extra_class', { class: attrs.class })
    return false
  }

  const src = attrs.src ?? ''
  if (!src || !isAllowedMediaSrc(src, context.origin)) {
    warn('html_image_src_invalid', { src })
    return false
  }

  if (!Object.prototype.hasOwnProperty.call(attrs, 'alt')) {
    warn('html_image_missing_alt')
    return false
  }

  const width = attrs.width
  if (typeof width === 'string' && width.length > 0) {
    if (!/^\d+$/.test(width)) {
      warn('html_image_invalid_dimension', { attribute: 'width', value: width })
      return false
    }
    const value = Number.parseInt(width, 10)
    if (value < 1 || value > 8192) {
      warn('html_image_invalid_dimension', { attribute: 'width', value: width })
      return false
    }
  }

  const height = attrs.height
  if (typeof height === 'string' && height.length > 0) {
    if (!/^\d+$/.test(height)) {
      warn('html_image_invalid_dimension', { attribute: 'height', value: height })
      return false
    }
    const value = Number.parseInt(height, 10)
    if (value < 1 || value > 8192) {
      warn('html_image_invalid_dimension', { attribute: 'height', value: height })
      return false
    }
  }

  const loading = attrs.loading ?? ''
  if (loading.toLowerCase() !== 'lazy') {
    warn('html_image_invalid_loading', { value: loading })
    return false
  }

  const decoding = attrs.decoding ?? ''
  if (decoding.toLowerCase() !== 'async') {
    warn('html_image_invalid_decoding', { value: decoding })
    return false
  }

  const describedBy = attrs['aria-describedby']
  if (describedBy && !CAPTION_ID_PATTERN.test(describedBy)) {
    warn('html_image_invalid_aria', { value: describedBy })
    return false
  }

  return true
}

function captionHtmlHasContent(html: string): boolean {
  const trimmed = html
    .replace(/<\/?(strong|em|code)>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .trim()
  if (trimmed.length > 0) {
    return true
  }
  return /<br\s*\/?>/i.test(html)
}

function validateFigureBlocks(
  html: string,
  context: EditorRenderContext,
  warn: WarnFn,
  allowImages: boolean,
): { valid: boolean; images: number } {
  const figureRegex = /<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi
  let match: RegExpExecArray | null
  let imageCount = 0

  while ((match = figureRegex.exec(html)) !== null) {
    if (!allowImages) {
      warn('html_images_not_allowed')
      return { valid: false, images: imageCount }
    }

    const attrs = parseAttributes(match[1] ?? '')
    if (!attrs) {
      warn('html_figure_invalid_attributes')
      return { valid: false, images: imageCount }
    }

    const attrNames = Object.keys(attrs)
    if (attrNames.some((name) => name !== 'class')) {
      warn('html_figure_unexpected_attribute', { attributes: attrNames })
      return { valid: false, images: imageCount }
    }

    const classTokens = (attrs.class ?? '').split(/\s+/).filter(Boolean)
    if (!classTokens.includes('editor-figure')) {
      warn('html_figure_missing_class')
      return { valid: false, images: imageCount }
    }
    const sizeToken = classTokens.find((token) => token.startsWith('editor-figure--size-'))
    const alignToken = classTokens.find((token) => token.startsWith('editor-figure--align-'))
    if (!sizeToken || !alignToken) {
      warn('html_figure_missing_size_align')
      return { valid: false, images: imageCount }
    }
    const sizeValue = sizeToken.substring('editor-figure--size-'.length)
    const alignValue = alignToken.substring('editor-figure--align-'.length)
    if (!IMAGE_FIGURE_SIZES.includes(sizeValue as ImageFigureSize)) {
      warn('html_figure_invalid_size', { size: sizeValue })
      return { valid: false, images: imageCount }
    }
    if (!IMAGE_FIGURE_ALIGNS.includes(alignValue as ImageFigureAlign)) {
      warn('html_figure_invalid_align', { align: alignValue })
      return { valid: false, images: imageCount }
    }

    const extraTokens = classTokens.filter(
      (token) => !['editor-figure', sizeToken, alignToken].includes(token),
    )
    if (extraTokens.length > 0) {
      warn('html_figure_extra_class', { class: attrs.class })
      return { valid: false, images: imageCount }
    }

    const inner = match[2] ?? ''
    if (/<figure\b/i.test(inner)) {
      warn('html_nested_figure')
      return { valid: false, images: imageCount }
    }

    const imgMatches = Array.from(inner.matchAll(/<img\b([^>]*)>/gi))
    if (imgMatches.length !== 1) {
      warn('html_figure_image_count', { count: imgMatches.length })
      return { valid: false, images: imageCount }
    }

    const imgAttrs = parseAttributes(imgMatches[0][1] ?? '')
    if (!imgAttrs) {
      warn('html_image_invalid_attributes')
      return { valid: false, images: imageCount }
    }

    if (!validateImageAttributes(imgAttrs, context, warn)) {
      return { valid: false, images: imageCount }
    }

    const figcaptionMatch = /<figcaption\b([^>]*)>([\s\S]*?)<\/figcaption>/i.exec(inner)
    if (!figcaptionMatch) {
      warn('html_missing_figcaption')
      return { valid: false, images: imageCount }
    }

    const figcaptionAttrs = parseAttributes(figcaptionMatch[1] ?? '')
    if (!figcaptionAttrs) {
      warn('html_figcaption_invalid_attributes')
      return { valid: false, images: imageCount }
    }

    const figcaptionAttrNames = Object.keys(figcaptionAttrs)
    if (figcaptionAttrNames.some((name) => !ALLOWED_FIGCAPTION_ATTRIBUTES.has(name))) {
      warn('html_figcaption_unexpected_attribute', { attributes: figcaptionAttrNames })
      return { valid: false, images: imageCount }
    }

    const figcaptionClasses = (figcaptionAttrs.class ?? '').split(/\s+/).filter(Boolean)
    if (figcaptionClasses.some((token) => token !== 'editor-figcaption')) {
      warn('html_figcaption_invalid_class', { class: figcaptionAttrs.class })
      return { valid: false, images: imageCount }
    }

    const captionId = figcaptionAttrs.id ?? ''
    if (!CAPTION_ID_PATTERN.test(captionId)) {
      warn('html_figcaption_invalid_id', { id: captionId })
      return { valid: false, images: imageCount }
    }

    const captionHtml = figcaptionMatch[2] ?? ''
    const captionHasText = captionHtmlHasContent(captionHtml)

    const describedBy = imgAttrs['aria-describedby']
    if (captionHasText && describedBy !== captionId) {
      warn('html_image_missing_aria', { describedBy, captionId })
      return { valid: false, images: imageCount }
    }
    if (!captionHasText && describedBy) {
      warn('html_image_superfluous_aria', { describedBy })
      return { valid: false, images: imageCount }
    }

    const captionTagPattern = /<\/?([a-z0-9-]+)\b/gi
    let captionTagMatch: RegExpExecArray | null
    while ((captionTagMatch = captionTagPattern.exec(captionHtml)) !== null) {
      const tag = captionTagMatch[1].toLowerCase()
      if (!ALLOWED_FIGCAPTION_TAGS.has(tag)) {
        warn('html_figcaption_invalid_tag', { tag })
        return { valid: false, images: imageCount }
      }
    }

    const remainder = inner
      .replace(imgMatches[0][0], '')
      .replace(figcaptionMatch[0], '')
      .trim()
    if (remainder.length > 0) {
      warn('html_figure_unexpected_content')
      return { valid: false, images: imageCount }
    }

    imageCount += 1
  }

  return { valid: true, images: imageCount }
}

const FORBIDDEN_TAG_PATTERN = /<\s*(script|style|iframe|object|embed|link|meta|base)\b/i
const EVENT_HANDLER_PATTERN = /on[a-z]+\s*=\s*"/i
const JAVASCRIPT_PROTOCOL_PATTERN = /javascript:/i

export function isSafeEditorHtml(
  html: string,
  context: EditorRenderContext = {},
): boolean {
  const warn = (reason: string, extra?: Record<string, unknown>) => warnWithContext(context, reason, extra)
  const profile = resolveProfile(context.profile)
  const allowImages = profile === 'full'
  if (!html || typeof html !== 'string') {
    warn('html_missing')
    return false
  }
  if (FORBIDDEN_TAG_PATTERN.test(html)) {
    warn('html_forbidden_tag')
    return false
  }
  if (EVENT_HANDLER_PATTERN.test(html)) {
    warn('html_event_handler_attribute')
    return false
  }
  if (JAVASCRIPT_PROTOCOL_PATTERN.test(html)) {
    warn('html_javascript_protocol')
    return false
  }
  if (!allowImages && /<img\b/i.test(html)) {
    warn('html_images_not_allowed')
    return false
  }
  if (STYLE_ATTRIBUTE_PATTERN.test(html)) {
    warn('html_style_attribute')
    return false
  }
  const tagPattern = /<\/?([a-z0-9-]+)\b/gi
  let match: RegExpExecArray | null
  while ((match = tagPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    if (!ALLOWED_HTML_TAGS.has(tag)) {
      warn('html_unexpected_tag', { tag })
      return false
    }
    if (!allowImages && tag === 'img') {
      warn('html_images_not_allowed')
      return false
    }
  }
  const { valid, images } = validateFigureBlocks(html, context, warn, allowImages)
  if (!valid) {
    return false
  }
  const totalImages = (html.match(/<img\b/gi) ?? []).length
  if (totalImages !== images) {
    warn('html_image_outside_figure')
    return false
  }
  const figureRegexGlobal = /<figure\b[^>]*>[\s\S]*?<\/figure>/gi
  const withoutFigures = html.replace(figureRegexGlobal, '')
  if (/<figcaption\b/i.test(withoutFigures)) {
    warn('html_figcaption_outside_figure')
    return false
  }
  return true
}

export function selectRenderedHtml(
  jsonInput: unknown,
  storedHtml: string | null | undefined,
  context: EditorRenderContext = {},
): { html: string; fromStored: boolean } {
  const profile = resolveProfile(context.profile)
  const warn = (reason: string, extra?: Record<string, unknown>) => warnWithContext(context, reason, extra)

  if (storedHtml && isSafeEditorHtml(storedHtml, context)) {
    return { html: storedHtml, fromStored: true }
  }

  if (storedHtml) {
    warn('stored_html_invalid')
  }

  const sanitized = sanitizeEditorJson(jsonInput, context)
  if (!sanitized) {
    warn('json_invalid_fallback')
    return { html: '<p></p>', fromStored: false }
  }

  return {
    html: renderHtmlFromSanitizedDoc(sanitized, { profile }),
    fromStored: false,
  }
}

export function wrapWithProse(html: string, className: string): string {
  return `<article class="${className}">${html}</article>`
}

export { EMPTY_DOC as EMPTY_EDITOR_DOC, MEDIA_SRC_PATTERN }
