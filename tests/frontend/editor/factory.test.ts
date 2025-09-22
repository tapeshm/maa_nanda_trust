import { describe, it, expect, beforeEach, vi } from 'vitest'

const starterKit = { name: 'starter-kit' }
const placeholderConfigured = { name: 'placeholder' }
const placeholderConfigure = vi.fn(() => placeholderConfigured)
const imageExtension = { name: 'image' }

const editorConstructor = vi.fn()

vi.mock('@tiptap/starter-kit', () => ({
  default: starterKit,
}))

vi.mock('@tiptap/extension-placeholder', () => ({
  default: {
    configure: placeholderConfigure,
  },
}))

vi.mock('@tiptap/extension-image', () => ({
  default: imageExtension,
}))

vi.mock('@tiptap/core', () => ({
  Editor: class EditorStub {
    options: unknown

    constructor(options: unknown) {
      this.options = options
      editorConstructor(options)
    }

    destroy = vi.fn()
  },
}))

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
    expect(options?.extensions).toEqual([starterKit, placeholderConfigured, imageExtension])
  })

  it('editorProps apply Tailwind prose classes and disable CSS injection', async () => {
    const { createEditor } = await import('../../../src/frontend/editor/factory')

    createEditor({} as HTMLElement, 'basic')

    const [options] = editorConstructor.mock.calls.at(-1) ?? []
    expect(options?.injectCSS).toBe(false)
    expect(options?.editorProps?.attributes?.class).toBe('prose max-w-none focus:outline-none')
  })

  it('placeholder defaults to "Start writing…"', async () => {
    await import('../../../src/frontend/editor/factory')
    const { PLACEHOLDER_TEXT } = await import('../../../src/utils/editor/extensions')

    expect(PLACEHOLDER_TEXT).toBe('Start writing…')
    expect(placeholderConfigure).toHaveBeenCalledWith({ placeholder: PLACEHOLDER_TEXT })
  })
})
