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

vi.mock('@tiptap/starter-kit', () => ({
  default: starterKit,
}))

vi.mock('@tiptap/extension-placeholder', () => ({
  default: {
    configure: placeholderConfigure,
  },
}))

vi.mock('@tiptap/extension-image', () => ({
  default: { name: 'image' },
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
    // [D3:editor-tiptap.step-11:test-update] PROSE_BASE now uses namespaced content-prose prose
    expect(PROSE_BASE).toBe('content-prose prose')
    expect(PROSE_BASE).toContain('content-prose')
    expect(PROSE_BASE).toContain('prose')
    expect(EDITOR_CHROME).toContain('focus:outline-none')
    expect(EDITOR_CLASSNAME.split(' ')).toEqual(
      expect.arrayContaining([...PROSE_BASE.split(' '), ...EDITOR_CHROME.split(' ')]),
    )
  })

  it('exposes shared prose wrapper for SSR parity', () => {
    expect(PUBLIC_CONTENT_WRAPPER_CLASSNAME).toBe(PROSE_BASE)
  })
})
