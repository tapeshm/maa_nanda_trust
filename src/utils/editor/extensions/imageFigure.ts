import { Node, mergeAttributes } from '@tiptap/core'
import type { CommandProps, RawCommands } from '@tiptap/core'

export const IMAGE_FIGURE_NODE_NAME = 'imageFigure'

export type ImageFigureSize = 'original' | 'large' | 'medium' | 'small'
export type ImageFigureAlign = 'start' | 'center' | 'end'

export interface ImageFigureAttrs {
  src: string
  alt: string
  width: number | null
  height: number | null
  size: ImageFigureSize
  align: ImageFigureAlign
  captionId: string
}

export interface SetImageFigureOptions {
  src: string
  alt?: string
  width?: number | null
  height?: number | null
  size?: ImageFigureSize
  align?: ImageFigureAlign
  captionText?: string
}

export interface UpdateImageFigureOptions {
  size?: ImageFigureSize
  align?: ImageFigureAlign
}

const CAPTION_ID_PATTERN = /^imgcap-[A-Za-z0-9_-]{8,22}$/
const MEDIA_PATH_PATTERN = /^\/media\/[A-Za-z0-9/_\-.]+$/
const ABSOLUTE_MEDIA_PATTERN = /^https?:\/\/[^/]+\/media\/[A-Za-z0-9/_\-.]+$/

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setImageFigure: (options: SetImageFigureOptions) => ReturnType
    updateImageFigure: (options: UpdateImageFigureOptions) => ReturnType
  }
}

const CAPTION_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789_-'
const CAPTION_ID_LENGTH = 10

function customAlphabet(alphabet: string, size: number): () => string {
  const chars = alphabet.split('')
  const charCount = chars.length
  return () => {
    const bytes = new Uint8Array(size)
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes)
    } else {
      for (let index = 0; index < size; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256)
      }
    }
    let id = ''
    for (let index = 0; index < size; index += 1) {
      const charIndex = bytes[index] % charCount
      id += chars[charIndex]
    }
    return id
  }
}

const CAPTION_ID_GENERATOR = customAlphabet(CAPTION_ID_ALPHABET, CAPTION_ID_LENGTH)

export const IMAGE_FIGURE_SIZES: readonly ImageFigureSize[] = Object.freeze([
  'original',
  'large',
  'medium',
  'small',
])

export const IMAGE_FIGURE_ALIGNS: readonly ImageFigureAlign[] = Object.freeze(['start', 'center', 'end'])

const DEFAULT_SIZE: ImageFigureSize = 'medium'
const DEFAULT_ALIGN: ImageFigureAlign = 'center'

function isValidCaptionId(value: unknown): value is string {
  return typeof value === 'string' && CAPTION_ID_PATTERN.test(value)
}

function createCaptionId(): string {
  return `imgcap-${CAPTION_ID_GENERATOR()}`
}

export function ensureCaptionId(value: unknown): string {
  return isValidCaptionId(value) ? (value as string) : createCaptionId()
}

function normalizeDimension(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    const value = Math.trunc(input)
    return Math.min(Math.max(value, 1), 8192)
  }

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed || !/^-?\d+$/.test(trimmed)) {
      return null
    }
    const parsed = Number.parseInt(trimmed, 10)
    if (!Number.isFinite(parsed)) {
      return null
    }
    const value = Math.trunc(parsed)
    return Math.min(Math.max(value, 1), 8192)
  }

  return null
}

function normalizeSize(value: unknown): ImageFigureSize {
  if (typeof value === 'string' && (IMAGE_FIGURE_SIZES as readonly string[]).includes(value)) {
    return value as ImageFigureSize
  }
  return DEFAULT_SIZE
}

function normalizeAlign(value: unknown): ImageFigureAlign {
  if (typeof value === 'string' && (IMAGE_FIGURE_ALIGNS as readonly string[]).includes(value)) {
    return value as ImageFigureAlign
  }
  return DEFAULT_ALIGN
}

function normalizeAlt(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeSrc(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  const trimmed = value.trim()
  if (MEDIA_PATH_PATTERN.test(trimmed) || ABSOLUTE_MEDIA_PATTERN.test(trimmed)) {
    return trimmed
  }
  return ''
}

export function normalizeImageFigureAttrs(
  attrs: Partial<ImageFigureAttrs> & { src?: unknown },
  fallback?: ImageFigureAttrs,
): ImageFigureAttrs | null {
  const srcCandidate = typeof attrs.src === 'undefined' ? fallback?.src : attrs.src
  const src = normalizeSrc(srcCandidate)
  if (!src) {
    return null
  }

  const alt = normalizeAlt('alt' in attrs ? attrs.alt : fallback?.alt)
  const width =
    'width' in attrs ? normalizeDimension(attrs.width) : normalizeDimension(fallback?.width ?? null)
  const height =
    'height' in attrs ? normalizeDimension(attrs.height) : normalizeDimension(fallback?.height ?? null)
  const size = normalizeSize('size' in attrs ? attrs.size : fallback?.size)
  const align = normalizeAlign('align' in attrs ? attrs.align : fallback?.align)
  const captionId = ensureCaptionId('captionId' in attrs ? attrs.captionId : fallback?.captionId)

  return { src, alt, width, height, size, align, captionId }
}

function asHtmlImageElement(element: Element | null): HTMLImageElement | null {
  if (!element) return null
  if (typeof HTMLImageElement !== 'undefined' && element instanceof HTMLImageElement) {
    return element
  }
  if ((element as HTMLElement)?.tagName === 'IMG') {
    return element as HTMLImageElement
  }
  return null
}

function extractImgAttributes(element: Element): ImageFigureAttrs | null {
  const explicitImage = asHtmlImageElement(element)
  const img = explicitImage ?? (element.querySelector('img') as HTMLImageElement | null)
  if (!img) {
    return null
  }

  const src = normalizeSrc(img.getAttribute('src'))
  if (!src) {
    return null
  }

  const width = normalizeDimension(img.getAttribute('width'))
  const height = normalizeDimension(img.getAttribute('height'))
  const alt = normalizeAlt(img.getAttribute('alt'))

  const figure =
    (typeof Element !== 'undefined' && typeof (img as any).closest === 'function' ? img.closest('figure') : null) ??
    (element.tagName === 'FIGURE' ? (element as HTMLElement) : null)

  const classTokens = figure?.className ? figure.className.split(/\s+/) : []
  const sizeToken = classTokens?.find?.((token) => token.startsWith('editor-figure--size-'))
  const alignToken = classTokens?.find?.((token) => token.startsWith('editor-figure--align-'))

  const size = normalizeSize(sizeToken?.split('editor-figure--size-')[1])
  const align = normalizeAlign(alignToken?.split('editor-figure--align-')[1])

  const figcaption = figure?.querySelector?.('figcaption') ?? null
  const captionId = ensureCaptionId(figcaption?.getAttribute?.('id'))

  return { src, alt, width, height, size, align, captionId }
}

function renderClasses(attrs: ImageFigureAttrs): string {
  return [
    'editor-figure',
    `editor-figure--size-${attrs.size}`,
    `editor-figure--align-${attrs.align}`,
  ].join(' ')
}

function renderImageAttributes(attrs: ImageFigureAttrs, hasCaptionContent: boolean) {
  const base: Record<string, string> = {
    class: 'editor-image',
    src: attrs.src,
    alt: attrs.alt,
    loading: 'lazy',
    decoding: 'async',
  }

  if (typeof attrs.width === 'number') {
    base.width = String(attrs.width)
  }
  if (typeof attrs.height === 'number') {
    base.height = String(attrs.height)
  }
  if (hasCaptionContent) {
    base['aria-describedby'] = attrs.captionId
  }

  return base
}

export const imageFigure = Node.create({
  name: IMAGE_FIGURE_NODE_NAME,
  group: 'block',
  content: 'inline*',
  selectable: true,
  draggable: true,
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      width: { default: null },
      height: { default: null },
      size: { default: DEFAULT_SIZE },
      align: { default: DEFAULT_ALIGN },
      captionId: {
        default: () => ensureCaptionId(null),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
        getAttrs: (element) => extractImgAttributes(element),
      },
      {
        tag: 'img[src]',
        getAttrs: (element) => extractImgAttributes(element),
      },
    ]
  },

  renderHTML({ node }) {
    const attrs = normalizeImageFigureAttrs(node.attrs as ImageFigureAttrs)
    if (!attrs) {
      return ['figure', { class: 'editor-figure editor-figure--size-medium editor-figure--align-center' }, ['img', { class: 'editor-image', src: '', alt: '', loading: 'lazy', decoding: 'async' }]]
    }

    const hasCaptionContent = Boolean(node.textContent?.trim())
    const figureAttrs = mergeAttributes({ class: renderClasses(attrs) })
    const imageAttrs = mergeAttributes(renderImageAttributes(attrs, hasCaptionContent))

    return [
      'figure',
      figureAttrs,
      ['img', imageAttrs],
      ['figcaption', { class: 'editor-figcaption', id: attrs.captionId }, 0],
    ]
  },

  addCommands() {
    const commands = {
      setImageFigure:
        (options: SetImageFigureOptions) =>
        ({ editor }: CommandProps) => {
          const attrs = normalizeImageFigureAttrs({
            src: options.src,
            alt: options.alt ?? '',
            width: options.width ?? null,
            height: options.height ?? null,
            size: options.size ?? DEFAULT_SIZE,
            align: options.align ?? DEFAULT_ALIGN,
          })

          if (!attrs) {
            return false
          }

          const content = (options.captionText ?? '').trim().length > 0 ? [{ type: 'text', text: options.captionText ?? '' }] : []

          return editor
            .chain()
            .focus()
            .insertContent({
              type: IMAGE_FIGURE_NODE_NAME,
              attrs,
              content,
            })
            .run()
        },
      updateImageFigure:
        (options: UpdateImageFigureOptions) =>
        ({ editor }: CommandProps) => {
          const size = normalizeSize(options.size)
          const align = normalizeAlign(options.align)
          return editor.chain().focus().updateAttributes(IMAGE_FIGURE_NODE_NAME, { size, align }).run()
        },
    }

    return commands as Partial<RawCommands>
  },
})

export default imageFigure
