// [D3:editor-tiptap.step-12:image-figure-node] Accessible image node with controlled attributes

import { Node, mergeAttributes } from '@tiptap/core'

export interface ImageFigureOptions {
  HTMLAttributes: Record<string, any>
}

export interface ImageFigureAttrs {
  src: string
  alt: string
  size: 's' | 'm' | 'l' | 'xl'
  align: 'left' | 'center' | 'right'
}

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
  if (lowerSrc.startsWith('http:')) {
    return true
  }

  return false
}

// [D3:editor-tiptap.step-12:attr-clamping] Clamp invalid size/align to defaults
function clampSize(size: unknown): ImageFigureAttrs['size'] {
  if (size === 's' || size === 'm' || size === 'l' || size === 'xl') {
    return size
  }
  return 'm'
}

function clampAlign(align: unknown): ImageFigureAttrs['align'] {
  if (align === 'left' || align === 'center' || align === 'right') {
    return align as ImageFigureAttrs['align']
  }
  return 'center'
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageFigure: {
      setImageFigure: (attrs: Partial<ImageFigureAttrs>) => ReturnType
      setImageSize: (size: ImageFigureAttrs['size']) => ReturnType
      setImageAlign: (align: ImageFigureAttrs['align']) => ReturnType
      updateImageAlt: (alt: string) => ReturnType
    }
  }
}

// [D3:editor-tiptap.step-12:image-figure-extension] Custom Tiptap node for accessible images
export const ImageFigure = Node.create<ImageFigureOptions>({
  name: 'imageFigure',

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
          return { 'data-size': clampSize(attributes.size) }
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
          return { 'data-align': clampAlign(attributes.align) }
        },
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
    const { src, alt, size, align } = node.attrs as ImageFigureAttrs

    if (!src || !isAllowedImageSrc(src)) {
      return ['figure', { class: 'editor-figure' }, ['p', 'Invalid image']]
    }

    const sizeClass = `editor-figure--size-${clampSize(size)}`
    const alignClass = `editor-figure--align-${clampAlign(align)}`

    return [
      'figure',
      mergeAttributes(
        {
          class: `editor-figure ${sizeClass} ${alignClass}`,
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

          return commands.insertContent({
            type: this.name,
            attrs: {
              src,
              alt: attrs.alt || '',
              size: clampSize(attrs.size),
              align: clampAlign(attrs.align),
            },
          })
        },
      setImageSize:
        (size) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { size: clampSize(size) })
        },
      setImageAlign:
        (align) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { align: clampAlign(align) })
        },
      updateImageAlt:
        (alt) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { alt: alt || '' })
        },
    }
  },
})

export default ImageFigure
