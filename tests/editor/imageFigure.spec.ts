// [D3:editor-tiptap.step-12:image-figure-tests] imageFigure node behaviour (command-free)

import { describe, it, expect } from 'vitest'
import { ImageFigure } from '../../src/frontend/editor/extensions/imageFigure'
import {
  clampImageFigureAlign,
  clampImageFigureSize,
  clampImageFigureWrap,
  normalizeImageFigureAttrs,
} from '../../src/frontend/editor/extensions/imageFigureShared'

function createElementStub(options: {
  tag: 'figure' | 'img'
  classes?: string[]
  attrs?: Record<string, string>
}): any {
  const { tag, classes = [], attrs = {} } = options
  const classSet = new Set(classes)
  return {
    tagName: tag.toUpperCase(),
    getAttribute: (key: string) => attrs[key] ?? null,
    querySelector: (selector: string) => {
      if (tag === 'figure' && selector === 'img') {
        return createElementStub({ tag: 'img', attrs })
      }
      return null
    },
    classList: {
      contains: (value: string) => classSet.has(value),
    },
  }
}

describe('[D3:editor-tiptap.step-12] imageFigure helpers', () => {
  it('clamps size, align, and wrap values', () => {
    expect(clampImageFigureSize('xl')).toBe('xl')
    expect(clampImageFigureSize('invalid')).toBe('m')

    expect(clampImageFigureAlign('right')).toBe('right')
    expect(clampImageFigureAlign('off')).toBe('center')

    expect(clampImageFigureWrap('break')).toBe('break')
    expect(clampImageFigureWrap('other')).toBe('text')
  })

  it('normalizes attributes with sensible defaults', () => {
    const normalized = normalizeImageFigureAttrs({
      src: '/media/test.png',
      alt: 42 as any,
      size: 'something',
      align: 'somewhere',
      wrap: 'unknown',
    })

    expect(normalized).toEqual({
      src: '/media/test.png',
      alt: '',
      size: 'm',
      align: 'center',
      wrap: 'text',
    })
  })
})

describe('[D3:editor-tiptap.step-12] imageFigure renderHTML', () => {
  it('renders figure/img/figcaption structure', () => {
    const output = ImageFigure.config.renderHTML!.call(ImageFigure, {
      node: {
        attrs: {
          src: '/media/demo.png',
          alt: 'Demo',
          size: 'l',
          align: 'right',
          wrap: 'break',
        },
      } as any,
      HTMLAttributes: {},
    })

    expect(output[0]).toBe('figure')
    const attributes = output[1] as Record<string, string>
    expect(attributes.class).toContain('editor-figure')
    expect(attributes.class).toContain('editor-figure--size-l')
    expect(attributes.class).toContain('editor-figure--align-right')
    expect(attributes.class).toContain('editor-figure--wrap-break')

    const children = output.slice(2)
    expect(children[0]).toEqual(['img', { src: '/media/demo.png', alt: 'Demo', class: 'editor-image' }])
    expect(children[1]).toEqual(['figcaption', { class: 'editor-figcaption' }, 0])
  })
})

describe('[D3:editor-tiptap.step-12] imageFigure parseHTML', () => {
  it('accepts existing figure markup with expected classes', () => {
    const figure = createElementStub({
      tag: 'figure',
      classes: [
        'editor-figure',
        'editor-figure--size-s',
        'editor-figure--align-left',
        'editor-figure--wrap-break',
      ],
      attrs: { src: '/media/demo.png', alt: 'Demo' },
    })

    const matcher = ImageFigure.config.parseHTML!.call(ImageFigure)[0]
    const attrs = matcher.getAttrs?.(figure)
    expect(attrs).toBeNull()
  })

  it('migrates bare img tags into imageFigure attrs', () => {
    const img = createElementStub({
      tag: 'img',
      attrs: { src: '/media/demo.png', alt: 'Demo' },
    })

    const matcher = ImageFigure.config.parseHTML!.call(ImageFigure)[1]
    const attrs = matcher.getAttrs?.(img)
    expect(attrs).toEqual({
      src: '/media/demo.png',
      alt: 'Demo',
      size: 'm',
      align: 'center',
    })
  })
})
