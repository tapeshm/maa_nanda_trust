import { Node, mergeAttributes } from '@tiptap/core'

// [D3:editor-tiptap.step-12:image-figure-node] Accessible image node with controlled attributes

export interface ImageFigureOptions {
  HTMLAttributes: Record<string, any>
}

import {
  clampImageFigureAlign,
  clampImageFigureSize,
  clampImageFigureWrap,
  findImageFigureSelection,
  normalizeImageFigureAttrs,
  type ImageFigureAttrs,
} from './imageFigureShared'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { EDITOR_OPTIONAL_IMAGE_NODE } from '../../../editor/constants'

// [D3:editor-tiptap.step-12:url-validation] URL policy: allow https and relative, reject javascript/data
function isAllowedImageSrc(src: string): boolean {
  if (!src || typeof src !== 'string') {
    return false
  }

  const trimmed = src.trim()
  if (!trimmed) {
    return false
  }

  // Reject javascript: and data: protocols
  const lowerSrc = trimmed.toLowerCase()
  if (lowerSrc.startsWith('javascript:') || lowerSrc.startsWith('data:')) {
    return false
  }

  // Allow relative URLs (starting with /)
  if (trimmed.startsWith('/')) {
    return true
  }

  // Allow https: URLs
  if (lowerSrc.startsWith('https:')) {
    return true
  }

  // Allow http: URLs (for development)
  // TODO: remove this in production
  if (lowerSrc.startsWith('http:')) {
    return true
  }

  return false
}

function updateImageFigureNode(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  nodeName: string,
  apply: (attrs: ImageFigureAttrs) => ImageFigureAttrs,
): boolean {
  const selectionInfo = findImageFigureSelection(state, nodeName)
  if (!selectionInfo || !dispatch) {
    return false
  }

  const currentAttrs = normalizeImageFigureAttrs(selectionInfo.node.attrs)
  const nextAttrs = apply(currentAttrs)
  const tr = state.tr.setNodeMarkup(selectionInfo.pos, undefined, nextAttrs)
  dispatch(tr)
  return true
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageFigure: {
      setImageFigure: (attrs: Partial<ImageFigureAttrs>) => ReturnType
      setImageSize: (size: ImageFigureAttrs['size']) => ReturnType
      setImageAlign: (align: ImageFigureAttrs['align']) => ReturnType
      updateImageAlt: (alt: string) => ReturnType
      setImageWrap: (wrap: ImageFigureAttrs['wrap']) => ReturnType
    }
  }
}

// [D3:editor-tiptap.step-12:image-figure-extension] Custom Tiptap node for accessible images
export const ImageFigure = Node.create<ImageFigureOptions>({
  name: EDITOR_OPTIONAL_IMAGE_NODE.name,

  group: 'block',

  content: 'inline*',

  draggable: true,

  selectable: true,

  atom: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.querySelector('img')?.getAttribute('src'),
        renderHTML: (attributes) => {
          if (!attributes.src || !isAllowedImageSrc(attributes.src)) {
            return {}
          }
          return { 'data-src': attributes.src }
        },
      },
      alt: {
        default: '',
        parseHTML: (element) => element.querySelector('img')?.getAttribute('alt') || '',
        renderHTML: (attributes) => {
          return { 'data-alt': attributes.alt || '' }
        },
      },
      size: {
        default: 'm',
        parseHTML: (element) => {
          const classList = element.classList
          if (classList.contains('editor-figure--size-s')) return 's'
          if (classList.contains('editor-figure--size-m')) return 'm'
          if (classList.contains('editor-figure--size-l')) return 'l'
          if (classList.contains('editor-figure--size-xl')) return 'xl'
          return 'm'
        },
        renderHTML: (attributes) => {
          return { 'data-size': clampImageFigureSize(attributes.size) }
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => {
          const classList = element.classList
          if (classList.contains('editor-figure--align-left')) return 'left'
          if (classList.contains('editor-figure--align-center')) return 'center'
          if (classList.contains('editor-figure--align-right')) return 'right'
          return 'center'
        },
        renderHTML: (attributes) => {
          return { 'data-align': clampImageFigureAlign(attributes.align) }
        },
      },
      wrap: {
        default: 'text',
        parseHTML: (element) =>
          element.classList.contains('editor-figure--wrap-break') ? 'break' : 'text',
        renderHTML: (attributes) => ({ 'data-wrap': clampImageFigureWrap(attributes.wrap) }),
      },
    }
  },

  // [D3:editor-tiptap.step-12:parse-html] Migrate bare <img> into figure, strip inline styles/classes
  parseHTML() {
    return [
      {
        tag: 'figure.editor-figure',
        getAttrs: (node) => {
          const element = node as HTMLElement
          const img = element.querySelector('img')
          if (!img) return false

          const src = img.getAttribute('src')
          if (!src || !isAllowedImageSrc(src)) return false

          return null
        },
      },
      {
        tag: 'img',
        getAttrs: (node) => {
          const img = node as HTMLImageElement

          // Prevent parsing images that are already inside a figure
          if (img.closest('figure.editor-figure')) {
            return false
          }

          const src = img.getAttribute('src')
          if (!src || !isAllowedImageSrc(src)) return false

          return {
            src,
            alt: img.getAttribute('alt') || '',
            size: 'm',
            align: 'center',
          }
        },
      },
    ]
  },

  // [D3:editor-tiptap.step-12:render-html] Render figure with img + figcaption
  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, size, align, wrap } = node.attrs as ImageFigureAttrs

    if (!src || !isAllowedImageSrc(src)) {
      return ['figure', { class: 'editor-figure' }, ['p', 'Invalid image']]
    }

    const normalized = normalizeImageFigureAttrs({ src, alt, size, align, wrap })
    const sizeClass = `editor-figure--size-${normalized.size}`
    const alignClass = `editor-figure--align-${normalized.align}`
    const wrapClass =
      normalized.wrap === 'break' ? 'editor-figure--wrap-break' : 'editor-figure--wrap-text'

    return [
      'figure',
      mergeAttributes(
        {
          class: `editor-figure ${sizeClass} ${alignClass} ${wrapClass}`,
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      ['img', { src, alt: alt || '', class: 'editor-image' }],
      ['figcaption', { class: 'editor-figcaption' }, 0],
    ]
  },

  // [D3:editor-tiptap.step-12:commands] Commands with attr clamping
  addCommands() {
    return {
      setImageFigure:
        (attrs) =>
        ({ commands }) => {
          const src = attrs.src || ''
          if (!isAllowedImageSrc(src)) {
            return false
          }

          const normalized = normalizeImageFigureAttrs({
            ...attrs,
            src,
            alt: attrs.alt || '',
          })

          return commands.insertContent({
            type: this.name,
            attrs: {
              ...normalized,
            },
          })
        },
      setImageSize:
        (size) =>
        ({ state, dispatch }) => {
          return updateImageFigureNode(state, dispatch, this.name, (attrs) => ({
            ...attrs,
            size: clampImageFigureSize(size),
          }))
        },
      setImageAlign:
        (align) =>
        ({ state, dispatch }) => {
          return updateImageFigureNode(state, dispatch, this.name, (attrs) => ({
            ...attrs,
            align: clampImageFigureAlign(align),
          }))
        },
      updateImageAlt:
        (alt) =>
        ({ state, dispatch }) => {
          return updateImageFigureNode(state, dispatch, this.name, (attrs) => ({
            ...attrs,
            alt: alt || '',
          }))
        },
      setImageWrap:
        (wrap) =>
        ({ state, dispatch }) => {
          return updateImageFigureNode(state, dispatch, this.name, (attrs) => ({
            ...attrs,
            wrap: clampImageFigureWrap(wrap),
          }))
        },
    }
  },
})

export default ImageFigure
