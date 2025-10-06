import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EDITOR_CLASSNAME } from '../../../src/frontend/editor/styles'

const starterKit = { name: 'starter-kit' }
const placeholderConfigured = { name: 'placeholder' }
const placeholderConfigure = vi.fn(() => placeholderConfigured)
const imageFigureExtension = { name: 'imageFigure' }

const editorConstructor = vi.fn()

vi.mock('@tiptap/starter-kit', () => ({
  default: starterKit,
}))

vi.mock('@tiptap/extension-placeholder', () => ({
  default: {
    configure: placeholderConfigure,
  },
}))

vi.mock('../../src/utils/editor/extensions/imageFigure', () => ({
  default: imageFigureExtension,
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

describe('createEditor factory profiles', () => {
  beforeEach(async () => {
    vi.resetModules()
    editorConstructor.mockClear()
    placeholderConfigure.mockClear()
  })

  it('basic profile excludes Image extension', async () => {
    const { createEditor } = await import('../../../src/frontend/editor/factory')

    createEditor({} as HTMLElement, 'basic')

    const [options] = editorConstructor.mock.calls.at(-1) ?? []
    expect(options?.extensions).toEqual([starterKit, placeholderConfigured])
  })

  it('full profile includes Image extension', async () => {
    const { createEditor } = await import('../../../src/frontend/editor/factory')

    createEditor({} as HTMLElement, 'full')

    const [options] = editorConstructor.mock.calls.at(-1) ?? []
    expect(options?.extensions?.slice(0, 2)).toEqual([starterKit, placeholderConfigured])
    expect(options?.extensions?.[2]?.name).toBe('imageFigure')
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
