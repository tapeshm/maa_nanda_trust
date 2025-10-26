import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EDITOR_CLASSNAME } from '../../../src/frontend/editor/styles'

const starterKit = { name: 'starter-kit' }
const placeholderConfigured = { name: 'placeholder' }
const placeholderConfigure = vi.fn(() => placeholderConfigured)
const linkConfigured = { name: 'link' }
const linkConfigure = vi.fn(() => linkConfigured)
const imageFigureExtension = { name: 'imageFigure', type: 'node' }

const editorConstructor = vi.fn()

vi.mock('@tiptap/starter-kit', () => ({
  default: starterKit,
}))

vi.mock('@tiptap/extension-placeholder', () => ({
  default: {
    configure: placeholderConfigure,
  },
}))

vi.mock('@tiptap/extension-link', () => ({
  default: {
    configure: linkConfigure,
  },
}))

vi.mock('../../../src/frontend/editor/extensions/imageFigure', () => ({
  ImageFigure: imageFigureExtension,
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

describe('createEditor factory profiles', () => {
  beforeEach(async () => {
    vi.resetModules()
    editorConstructor.mockClear()
    placeholderConfigure.mockClear()
    linkConfigure.mockClear()
  })

  it('basic profile excludes ImageFigure extension', async () => {
    const { createEditor } = await import('../../../src/frontend/editor/factory')

    createEditor({} as HTMLElement, 'basic')

    const [options] = editorConstructor.mock.calls.at(-1) ?? []
    expect(options?.extensions).toEqual([starterKit, linkConfigured, placeholderConfigured])
  })

  it('full profile includes ImageFigure extension', async () => {
    const { createEditor } = await import('../../../src/frontend/editor/factory')

    createEditor({} as HTMLElement, 'full')

    const [options] = editorConstructor.mock.calls.at(-1) ?? []
    expect(options?.extensions?.slice(0, 3)).toEqual([
      starterKit,
      linkConfigured,
      placeholderConfigured,
    ])
    expect(options?.extensions?.at(-1)).toBe(imageFigureExtension)
  })

  it('editorProps apply Tailwind prose classes and disable CSS injection', async () => {
    const { createEditor } = await import('../../../src/frontend/editor/factory')

    createEditor({} as HTMLElement, 'basic')

    const [options] = editorConstructor.mock.calls.at(-1) ?? []
    expect(options?.injectCSS).toBe(false)
    expect(options?.editorProps?.attributes?.class).toBe(EDITOR_CLASSNAME)
  })

  it('placeholder defaults to "Start writing…"', async () => {
    await import('../../../src/frontend/editor/factory')
    const { PLACEHOLDER_TEXT } = await import('../../../src/utils/editor/extensions')

    expect(PLACEHOLDER_TEXT).toBe('Start writing…')
    expect(placeholderConfigure).toHaveBeenCalledWith({ placeholder: PLACEHOLDER_TEXT })
  })
})
