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
    expect(options?.editorProps?.attributes?.class).toContain('prose')
    expect(options?.editorProps?.attributes?.class).toContain('focus:outline-none')
  })
})
