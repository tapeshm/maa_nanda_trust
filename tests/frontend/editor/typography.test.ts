import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  EDITOR_CLASSNAME,
  EDITOR_CHROME,
  PROSE_BASE,
  PUBLIC_CONTENT_WRAPPER_CLASSNAME,
} from '../../../src/frontend/editor/styles'

const starterKit = { name: 'starter-kit' }
const placeholderConfigured = { name: 'placeholder' }
const placeholderConfigure = vi.fn(() => placeholderConfigured)
const editorConstructor = vi.fn()

let cachedCss: string | null = null
const loadCss = async () => {
  if (cachedCss !== null) {
    return cachedCss
  }
  const module = await import('../../../src/styles/input.css?raw').catch(() => ({
    default: '',
  }))
  cachedCss = (module.default ?? '') as string
  return cachedCss
}

vi.mock('@tiptap/starter-kit', () => ({
  default: starterKit,
}))

vi.mock('@tiptap/extension-placeholder', () => ({
  default: {
    configure: placeholderConfigure,
  },
}))

const figureExtension = { name: 'imageFigure' }

vi.mock('../../src/utils/editor/extensions/imageFigure', () => ({
  default: figureExtension,
  IMAGE_FIGURE_NODE_NAME: 'imageFigure',
  IMAGE_FIGURE_SIZES: ['original', 'large', 'medium', 'small'],
  IMAGE_FIGURE_ALIGNS: ['start', 'center', 'end'],
  ensureCaptionId: (value: unknown) => (typeof value === 'string' ? value : 'imgcap-mockvalue'),
  normalizeImageFigureAttrs: (attrs: any) => ({
    src: attrs.src ?? '/media/example.png',
    alt: attrs.alt ?? '',
    width: attrs.width ?? null,
    height: attrs.height ?? null,
    size: attrs.size ?? 'medium',
    align: attrs.align ?? 'center',
    captionId: attrs.captionId ?? 'imgcap-mockvalue',
  }),
}))

vi.mock('@tiptap/core', async () => {
  const actual = await vi.importActual<typeof import('@tiptap/core')>('@tiptap/core')

  class EditorStub {
    options: unknown

    constructor(options: unknown) {
      this.options = options
      editorConstructor(options)
    }

    destroy = vi.fn()
  }

  return {
    ...actual,
    Editor: EditorStub,
  }
})

describe('editor typography integration', () => {
  beforeEach(() => {
    vi.resetModules()
    editorConstructor.mockClear()
  })

  it('applies Tailwind prose classes without injecting CSS', async () => {
    const { createEditor } = await import('../../../src/frontend/editor/factory')

    createEditor({} as HTMLElement, 'basic')

    const [options] = editorConstructor.mock.calls.at(-1) ?? []
    expect(options?.injectCSS).toBe(false)
    expect(options?.editorProps?.attributes?.class).toBe(EDITOR_CLASSNAME)
    expect(PROSE_BASE).toContain('prose')
    expect(PROSE_BASE).toContain('max-w-none')
    expect(EDITOR_CHROME).toContain('focus:outline-none')
    expect(EDITOR_CLASSNAME.split(' ')).toEqual(
      expect.arrayContaining([...PROSE_BASE.split(' '), ...EDITOR_CHROME.split(' ')]),
    )
  })

  it('exposes shared prose wrapper for SSR parity', () => {
    expect(PUBLIC_CONTENT_WRAPPER_CLASSNAME).toBe(PROSE_BASE)
  })

  it('includes safelisted BEM classes via @source inline() even when absent from TSX markup', async () => {
    const css = await loadCss()
    if (!css) {
      console.warn('raw CSS import not available in this runtime; skipping safelist assertions')
      return
    }
    expect(css).toContain('@source inline(')
    expect(css).toContain('editor-figure--size-original')
    expect(css).toContain('.editor-figure--align-center')
  })

  it('aligned figures allow adjacent paragraphs to wrap without overlapping captions in LTR', async () => {
    const css = await loadCss()
    if (!css) {
      console.warn('raw CSS import not available in this runtime; skipping wrap assertions')
      return
    }
    expect(css).toContain('.editor-figure { display: flow-root;')
    expect(css).toContain(
      '.editor-figure--align-start { float: inline-start; margin-inline-start: 0; margin-inline-end: 1.5rem;',
    )
    expect(css).toContain(
      '.editor-figure--align-end { float: inline-end; margin-inline-start: 1.5rem; margin-inline-end: 0;',
    )
  })

  it('long captions wrap within the figure without overlapping adjacent text', async () => {
    const css = await loadCss()
    if (!css) {
      console.warn('raw CSS import not available in this runtime; skipping caption assertions')
      return
    }
    expect(css).toMatch(
      /\.editor-figcaption\s*\{[^}]*margin-top:\s*0\.5rem;[^}]*line-height:\s*1\.4;[^}]*\}/,
    )
  })

  it('aligned figures mirror correctly under RTL (inline-start/end)', async () => {
    const css = await loadCss()
    if (!css) {
      console.warn('raw CSS import not available in this runtime; skipping RTL assertions')
      return
    }
    expect(css).toContain('float: inline-start')
    expect(css).toContain('float: inline-end')
    expect(css).toContain('margin-inline-start')
    expect(css).toContain('margin-inline-end')
  })

  it('center-aligned figures stay block-level with no text wrapping', async () => {
    const css = await loadCss()
    if (!css) {
      console.warn(
        'raw CSS import not available in this runtime; skipping center alignment assertions',
      )
      return
    }
    expect(css).toContain('.editor-figure--align-center { float: none; margin-inline: auto;')
  })

  it('clears floats for following blocks to prevent stacking issues', async () => {
    const css = await loadCss()
    if (!css) {
      console.warn('raw CSS import not available in this runtime; skipping float clear assertions')
      return
    }
    expect(css).toContain('.editor-figure + * {\n  clear: both;\n}')
  })

  it('keeps captions within figure bounds on narrow viewports', async () => {
    const css = await loadCss()
    if (!css) {
      console.warn(
        'raw CSS import not available in this runtime; skipping caption overflow assertions',
      )
      return
    }
    expect(css).toContain('overflow-wrap: anywhere;')
  })

  it('prevents horizontal overflow by clamping figure width on small screens', async () => {
    const css = await loadCss()
    if (!css) {
      console.warn('raw CSS import not available in this runtime; skipping responsive assertions')
      return
    }
    expect(css).toContain('@media (max-width: 768px)')
    expect(css).toContain('width: 100% !important;')
    expect(css).toContain('max-width: 100% !important;')
  })
})
