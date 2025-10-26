// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import {
  registerToolbarForEditor,
  resetToolbarForTesting,
  unregisterToolbarForEditor,
} from '../../../src/frontend/editor/toolbar'
import type { EditorInstance } from '../../../src/frontend/editor/types'
import { EDITOR_DATA_ATTRIBUTES } from '../../../src/editor/constants'

const {
  command: DATA_ATTR_EDITOR_COMMAND,
  toolbarId: DATA_ATTR_EDITOR_TOOLBAR_ID,
  imageInputId: DATA_ATTR_EDITOR_IMAGE_INPUT_ID,
  imageAltId: DATA_ATTR_EDITOR_IMAGE_ALT_ID,
  root: DATA_ATTR_EDITOR_ROOT,
  profile: DATA_ATTR_EDITOR_PROFILE,
} = EDITOR_DATA_ATTRIBUTES

type ListenerMap = Map<string, Set<(...args: any[]) => void>>
type ButtonHandler = (event: Event) => void

describe('editor toolbar', () => {
  let listeners: ListenerMap
  let chainRun: ReturnType<typeof vi.fn>
  let canRun: ReturnType<typeof vi.fn>
  let setImageFigure: ReturnType<typeof vi.fn>
  let extendMarkRange: ReturnType<typeof vi.fn>
  let setLink: ReturnType<typeof vi.fn>
  let unsetLink: ReturnType<typeof vi.fn>
  let windowPrompt: ReturnType<typeof vi.fn>
  let windowAlert: ReturnType<typeof vi.fn>
  let windowConfirm: ReturnType<typeof vi.fn>

  beforeEach(() => {
    listeners = new Map()
    chainRun = vi.fn(() => true)
    canRun = vi.fn(() => true)
    setImageFigure = vi.fn(() => ({ run: vi.fn(() => true) }))
    extendMarkRange = vi.fn()
    setLink = vi.fn(() => ({ run: chainRun }))
    unsetLink = vi.fn(() => ({ run: chainRun }))
    windowConfirm = vi.fn(() => true)
    windowPrompt = vi.fn(() => 'https://example.com')
    windowAlert = vi.fn()
    ;(globalThis as any).HTMLFormElement = class {}
    ;(globalThis as any).window = {
      confirm: windowConfirm,
      prompt: windowPrompt,
      alert: windowAlert,
    }
  })

  afterEach(() => {
    resetToolbarForTesting()
    vi.restoreAllMocks()
    delete (globalThis as any).HTMLFormElement
    delete (globalThis as any).window
  })

  function createEditorStub() {
    const selection = { from: 0, to: 0 }

    const chain = {
      focus: vi.fn().mockReturnThis(),
      toggleBold: vi.fn().mockReturnThis(),
      toggleItalic: vi.fn().mockReturnThis(),
      toggleHeading: vi.fn().mockReturnThis(),
      toggleBlockquote: vi.fn().mockReturnThis(),
      toggleBulletList: vi.fn().mockReturnThis(),
      toggleOrderedList: vi.fn().mockReturnThis(),
      setHorizontalRule: vi.fn().mockReturnThis(),
      setImageFigure: vi.fn(({ src, alt }: { src: string; alt: string }) => {
        setImageFigure({ src, alt })
        return { run: vi.fn(() => true) }
      }),
      extendMarkRange: vi.fn((...args: any[]) => {
        extendMarkRange(...args)
        return chain
      }),
      setLink: (...args: any[]) => setLink(...args),
      unsetLink: (...args: any[]) => unsetLink(...args),
      run: chainRun,
    }

    const canChain = {
      focus: vi.fn().mockReturnThis(),
      toggleBold: vi.fn(() => ({ run: canRun })),
      toggleItalic: vi.fn(() => ({ run: canRun })),
      toggleHeading: vi.fn(() => ({ run: canRun })),
      toggleBlockquote: vi.fn(() => ({ run: canRun })),
      toggleBulletList: vi.fn(() => ({ run: canRun })),
      toggleOrderedList: vi.fn(() => ({ run: canRun })),
      setHorizontalRule: vi.fn(() => ({ run: canRun })),
      chain: vi.fn().mockReturnThis(),
      run: canRun,
    }

    const editor = {
      chain: vi.fn(() => chain),
      can: vi.fn(() => canChain),
      isActive: vi.fn(() => false),
      getAttributes: vi.fn(() => ({})),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        const set = listeners.get(event) ?? new Set()
        set.add(handler)
        listeners.set(event, set)
      }),
      off: vi.fn((event: string, handler: (...args: any[]) => void) => {
        const set = listeners.get(event)
        set?.delete(handler)
      }),
      state: { selection },
    }

    return {
      editor: editor as unknown as EditorInstance,
      selection,
      setSelection: (from: number, to: number) => {
        selection.from = from
        selection.to = to
      },
    }
  }

  function dispatch(event: string) {
    listeners.get(event)?.forEach((handler) => handler())
  }

  function createToolbarDom(options: { profile: 'basic' | 'full' }) {
    const { profile } = options

    const buttonListeners = new Map<HTMLButtonElement, Map<string, ButtonHandler[]>>()
    const targetListeners = new Map<any, Map<string, EventListener[]>>()

    const createButton = (command: string): HTMLButtonElement => {
      const listeners = new Map<string, ButtonHandler[]>()
      const attrs = new Map<string, string>()
      const classSet = new Set<string>()
      const dataset: Record<string, string> = {
        [DATA_ATTR_EDITOR_COMMAND.dataset]: command,
      }

      const button = {
        dataset,
        disabled: false,
        textContent: command,
        classList: {
          add: (value: string) => classSet.add(value),
          remove: (value: string) => classSet.delete(value),
          contains: (value: string) => classSet.has(value),
        },
        setAttribute: (name: string, value: string) => {
          attrs.set(name, value)
        },
        addEventListener: (type: string, handler: ButtonHandler) => {
          const arr = listeners.get(type) ?? []
          arr.push(handler)
          listeners.set(type, arr)
        },
        removeEventListener: (type: string, handler: ButtonHandler) => {
          const arr = listeners.get(type)
          if (!arr) return
          listeners.set(
            type,
            arr.filter((fn) => fn !== handler),
          )
        },
        click: () => {
          listeners.get('click')?.forEach((fn) => fn({ preventDefault() {} } as any))
        },
      } as HTMLButtonElement & {
        click: () => void
      }

      buttonListeners.set(button, listeners)
      return button
    }

    const commands: Array<['basic' | 'full' | 'shared', string]> = [
      ['shared', 'bold'],
      ['shared', 'italic'],
      ['shared', 'heading-2'],
      ['shared', 'heading-3'],
      ['shared', 'blockquote'],
      ['shared', 'bullet-list'],
      ['shared', 'ordered-list'],
      ['shared', 'link'],
      ['shared', 'section-break'],
      ['full', 'image'],
    ]

    const buttons = commands
      .filter(([scope]) => scope === 'shared' || profile === 'full')
      .map(([, command]) => createButton(command))

    const toolbar = {
      id: 'editor-root__toolbar',
      querySelectorAll: (selector: string) => {
        if (selector === DATA_ATTR_EDITOR_COMMAND.selector) {
          return buttons
        }
        return []
      },
    } as unknown as HTMLElement

    const fileInput =
      profile === 'full'
        ? ({
            id: 'editor-root__image-input',
            accept: 'image/png,image/jpeg,image/webp',
            files: null as FileList | null,
            value: '',
            addEventListener(type: string, handler: EventListener) {
              const listenerMap = targetListeners.get(this) ?? new Map()
              const arr = listenerMap.get(type) ?? []
              arr.push(handler)
              listenerMap.set(type, arr)
              targetListeners.set(this, listenerMap)
            },
            removeEventListener(type: string, handler: EventListener) {
              const listenerMap = targetListeners.get(this)
              if (!listenerMap) return
              const arr = listenerMap.get(type)
              if (!arr) return
              listenerMap.set(
                type,
                arr.filter((fn) => fn !== handler),
              )
            },
            dispatchEvent(event: Event) {
              targetListeners
                .get(this)
                ?.get(event.type)
                ?.forEach((fn) => fn(event))
              return true
            },
            click: vi.fn(),
          } as any)
        : null

    const altInput =
      profile === 'full'
        ? ({
            id: 'editor-root__alt-input',
            name: 'image_alt',
            value: 'Banner',
          } as HTMLInputElement)
        : null

    const csrfInput =
      profile === 'full' ? ({ name: 'csrf_token', value: 'csrf-token' } as HTMLInputElement) : null

    const form = Object.assign(new (globalThis.HTMLFormElement as any)(), {
      querySelector: (selector: string) => {
        if (selector.includes('csrf') && csrfInput) {
          return csrfInput
        }
        return null
      },
    }) as HTMLFormElement

    const doc = {
      getElementById: (id: string) => {
        if (id === toolbar.id) return toolbar
        if (fileInput && id === fileInput.id) return fileInput
        if (altInput && id === altInput.id) return altInput
        return null
      },
    }

    const root = {
      id: 'editor-root',
      dataset: {
        [DATA_ATTR_EDITOR_ROOT.dataset]: 'true',
        [DATA_ATTR_EDITOR_PROFILE.dataset]: profile,
        [DATA_ATTR_EDITOR_TOOLBAR_ID.dataset]: toolbar.id,
        ...(profile === 'full'
          ? {
              [DATA_ATTR_EDITOR_IMAGE_INPUT_ID.dataset]: fileInput?.id ?? '',
              [DATA_ATTR_EDITOR_IMAGE_ALT_ID.dataset]: altInput?.id ?? '',
            }
          : {}),
      } as Record<string, string>,
      ownerDocument: doc,
      closest: (selector: string) => (selector === 'form' ? form : null),
    } as unknown as HTMLElement

    return { root, toolbar, form, fileInput, altInput, buttons, buttonListeners }
  }

  it('executes formatting commands when buttons are clicked', () => {
    const { editor } = createEditorStub()
    const { root, buttons } = createToolbarDom({ profile: 'basic' })

    registerToolbarForEditor(root, editor, 'basic')

    const boldButton = buttons.find(
      (btn) => btn.dataset[DATA_ATTR_EDITOR_COMMAND.dataset] === 'bold',
    )!
    boldButton.click()

    expect(editor.chain).toHaveBeenCalled()
    expect(editor.can).toHaveBeenCalled()
    expect(chainRun).toHaveBeenCalled()

    dispatch('selectionUpdate')
    dispatch('transaction')
  })

  it('prompts for a URL and applies a normalized link when text is selected', () => {
    const { editor, setSelection } = createEditorStub()
    const { root, buttons } = createToolbarDom({ profile: 'basic' })

    registerToolbarForEditor(root, editor, 'basic')

    const linkButton = buttons.find(
      (btn) => btn.dataset[DATA_ATTR_EDITOR_COMMAND.dataset] === 'link',
    )!
    expect(linkButton.disabled).toBe(true)

    setSelection(1, 5)
    dispatch('selectionUpdate')
    expect(linkButton.disabled).toBe(false)

    windowPrompt.mockReturnValueOnce('https://Example.com/docs ')
    linkButton.click()

    expect(windowPrompt).toHaveBeenCalledWith('Enter link URL', '')
    expect(extendMarkRange).toHaveBeenCalledWith('link')
    expect(setLink).toHaveBeenCalledWith({ href: 'https://example.com/docs' })
    expect(unsetLink).not.toHaveBeenCalled()
  })

  it('alerts the user when the supplied link is invalid', () => {
    const { editor, setSelection } = createEditorStub()
    const { root, buttons } = createToolbarDom({ profile: 'basic' })

    registerToolbarForEditor(root, editor, 'basic')
    const linkButton = buttons.find(
      (btn) => btn.dataset[DATA_ATTR_EDITOR_COMMAND.dataset] === 'link',
    )!

    setSelection(2, 4)
    dispatch('selectionUpdate')
    windowPrompt.mockReturnValueOnce('javascript:alert(1)')

    linkButton.click()

    expect(windowAlert).toHaveBeenCalled()
    expect(setLink).not.toHaveBeenCalled()
    expect(unsetLink).not.toHaveBeenCalled()
  })

  it('removes an existing link when the prompt is cleared', () => {
    const { editor, setSelection } = createEditorStub()
    const { root, buttons } = createToolbarDom({ profile: 'basic' })

    const editorAny = editor as any
    editorAny.isActive = vi.fn(() => true)
    editorAny.getAttributes = vi.fn(() => ({ href: 'https://example.com/current' }))

    registerToolbarForEditor(root, editor, 'basic')
    const linkButton = buttons.find(
      (btn) => btn.dataset[DATA_ATTR_EDITOR_COMMAND.dataset] === 'link',
    )!

    setSelection(4, 4)
    dispatch('selectionUpdate')
    windowPrompt.mockReturnValueOnce('   ')

    linkButton.click()

    expect(windowPrompt).toHaveBeenCalledWith('Enter link URL', 'https://example.com/current')
    expect(unsetLink).toHaveBeenCalled()
    expect(setLink).not.toHaveBeenCalled()
  })

  it('triggers file input for image command in full profile', () => {
    const { editor } = createEditorStub()
    const { root, fileInput, buttons } = createToolbarDom({ profile: 'full' })
    const clickSpy = vi.spyOn(fileInput!, 'click')

    registerToolbarForEditor(root, editor, 'full')

    const imageButton = buttons.find(
      (btn) => btn.dataset[DATA_ATTR_EDITOR_COMMAND.dataset] === 'image',
    )!
    imageButton.click()

    expect(clickSpy).toHaveBeenCalled()
  })

  it('uploads image and inserts node with provided alt text', async () => {
    const { editor } = createEditorStub()
    const { root, fileInput, altInput } = createToolbarDom({ profile: 'full' })

    const file = new File([new Uint8Array([0xff, 0xd8])], 'photo.jpg', { type: 'image/jpeg' })
    const fileList: FileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file
      },
    } as any
    Object.defineProperty(fileInput!, 'files', {
      value: fileList,
      configurable: true,
    })

    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ url: '/media/photo.jpg' }),
    })

    registerToolbarForEditor(root, editor, 'full')

    fileInput!.dispatchEvent(new Event('change'))
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
      expect(setImageFigure).toHaveBeenCalled()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/upload-image',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(setImageFigure).toHaveBeenCalledWith({ src: '/media/photo.jpg', alt: altInput!.value })
  })

  it('prompts when alt text is empty and aborts on cancel', async () => {
    const { editor } = createEditorStub()
    const { root, fileInput, altInput } = createToolbarDom({ profile: 'full' })
    altInput!.value = ''

    const file = new File([new Uint8Array([0x00])], 'blank.png', { type: 'image/png' })
    const fileList: FileList = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file
      },
    } as any
    Object.defineProperty(fileInput!, 'files', {
      value: fileList,
      configurable: true,
    })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any)

    registerToolbarForEditor(root, editor, 'full')

    fileInput!.dispatchEvent(new Event('change'))
    await Promise.resolve()

    expect(confirmSpy).toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(setImageFigure).not.toHaveBeenCalled()
  })

  it('removes listeners on unregister', () => {
    const { editor } = createEditorStub()
    const { root } = createToolbarDom({ profile: 'basic' })

    registerToolbarForEditor(root, editor, 'basic')
    unregisterToolbarForEditor(root)

    listeners.forEach((handlers) => {
      expect(handlers.size).toBe(0)
    })
  })
})
