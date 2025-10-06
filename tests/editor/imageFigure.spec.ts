// [D3:editor-tiptap.step-12:image-figure-tests] Comprehensive tests for imageFigure node

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { ImageFigure } from '../../src/frontend/editor/extensions/imageFigure'

describe('[D3:editor-tiptap.step-12] imageFigure node', () => {
  let editor: Editor

  beforeEach(() => {
    const element = document.createElement('div')
    editor = new Editor({
      element,
      extensions: [StarterKit, ImageFigure],
      content: '',
    })
  })

  afterEach(() => {
    editor?.destroy()
  })

  describe('roundtrip', () => {
    it('preserves attrs and caption content through JSON roundtrip', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'imageFigure',
            attrs: { src: '/media/test.png', alt: 'Test image', size: 'l', align: 'center' },
            content: [{ type: 'text', text: 'Test caption' }],
          },
        ],
      }

      editor.commands.setContent(content)
      const output = editor.getJSON()

      expect(output.content).toHaveLength(1)
      const figure = output.content?.[0]
      expect(figure?.type).toBe('imageFigure')
      expect(figure?.attrs).toMatchObject({
        src: '/media/test.png',
        alt: 'Test image',
        size: 'l',
        align: 'center',
      })
      expect(figure?.content?.[0]).toMatchObject({ type: 'text', text: 'Test caption' })
    })
  })

  describe('DOM rendering', () => {
    it('renders with editor-figure, editor-image, and editor-figcaption classes', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'imageFigure',
            attrs: { src: '/media/test.png', alt: 'Test', size: 'm', align: 'center' },
            content: [],
          },
        ],
      })

      const html = editor.getHTML()
      expect(html).toContain('class="editor-figure')
      expect(html).toContain('editor-figure--size-m')
      expect(html).toContain('editor-figure--align-center')
      expect(html).toContain('class="editor-image"')
      expect(html).toContain('class="editor-figcaption"')
    })

    it('applies correct size and align classes', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'imageFigure',
            attrs: { src: '/media/test.png', alt: 'Test', size: 'xl', align: 'right' },
            content: [],
          },
        ],
      })

      const html = editor.getHTML()
      expect(html).toContain('editor-figure--size-xl')
      expect(html).toContain('editor-figure--align-right')
    })
  })

  describe('parseHTML migration', () => {
    it('migrates bare img tags into imageFigure', () => {
      const htmlInput = '<img src="/media/test.png" alt="Test image" />'
      editor.commands.setContent(htmlInput, { parseOptions: { preserveWhitespace: 'full' } })

      const json = editor.getJSON()
      expect(json.content).toHaveLength(1)
      expect(json.content?.[0]?.type).toBe('imageFigure')
      expect(json.content?.[0]?.attrs).toMatchObject({
        src: '/media/test.png',
        alt: 'Test image',
        size: 'm',
        align: 'center',
      })
    })

    it('parses existing figure elements', () => {
      const htmlInput =
        '<figure class="editor-figure editor-figure--size-l editor-figure--align-left"><img src="/media/test.png" alt="Test" class="editor-image" /><figcaption class="editor-figcaption">Caption</figcaption></figure>'
      editor.commands.setContent(htmlInput, { parseOptions: { preserveWhitespace: 'full' } })

      const json = editor.getJSON()
      expect(json.content?.[0]?.type).toBe('imageFigure')
      expect(json.content?.[0]?.attrs?.size).toBe('l')
      expect(json.content?.[0]?.attrs?.align).toBe('left')
    })
  })

  describe('commands', () => {
    it('clamps invalid size to default (m)', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'imageFigure',
            attrs: { src: '/media/test.png', alt: 'Test', size: 'xx' as any, align: 'center' },
            content: [],
          },
        ],
      })

      const json = editor.getJSON()
      expect(json.content?.[0]?.attrs?.size).toBe('m')
    })

    it('clamps invalid align to default (center)', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'imageFigure',
            attrs: { src: '/media/test.png', alt: 'Test', size: 'm', align: 'weird' as any },
            content: [],
          },
        ],
      })

      const json = editor.getJSON()
      expect(json.content?.[0]?.attrs?.align).toBe('center')
    })

    it('rejects javascript: protocol URLs', () => {
      const result = editor.commands.setImageFigure({
        src: 'javascript:alert(1)',
        alt: 'Evil',
      })

      expect(result).toBe(false)
      expect(editor.getJSON().content).toHaveLength(0)
    })

    it('rejects data: protocol URLs', () => {
      const result = editor.commands.setImageFigure({
        src: 'data:image/png;base64,abc',
        alt: 'Data',
      })

      expect(result).toBe(false)
    })

    it('accepts https: URLs', () => {
      const result = editor.commands.setImageFigure({
        src: 'https://example.com/image.png',
        alt: 'HTTPS image',
      })

      expect(result).toBe(true)
      expect(editor.getJSON().content?.[0]?.attrs?.src).toBe('https://example.com/image.png')
    })

    it('accepts relative URLs', () => {
      const result = editor.commands.setImageFigure({
        src: '/media/test.png',
        alt: 'Relative',
      })

      expect(result).toBe(true)
      expect(editor.getJSON().content?.[0]?.attrs?.src).toBe('/media/test.png')
    })

    it('setImageSize command clamps invalid values', () => {
      editor.commands.setImageFigure({ src: '/media/test.png', alt: 'Test' })
      editor.commands.setImageSize('invalid' as any)

      const json = editor.getJSON()
      expect(json.content?.[0]?.attrs?.size).toBe('m')
    })

    it('setImageAlign command clamps invalid values', () => {
      editor.commands.setImageFigure({ src: '/media/test.png', alt: 'Test' })
      editor.commands.setImageAlign('invalid' as any)

      const json = editor.getJSON()
      expect(json.content?.[0]?.attrs?.align).toBe('center')
    })
  })
})
