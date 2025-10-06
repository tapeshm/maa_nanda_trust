/** @jsxImportSource hono/jsx */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import { TextSelection } from '@tiptap/pm/state'

import {
  registerToolbarForEditor,
  resetToolbarForTesting,
} from '../../../src/frontend/editor/toolbar'
import { MENUBAR_BUTTON_ACTIVE_CLASSNAME } from '../../../src/frontend/editor/styles'
import EditorPage from '../../../src/templates/admin/editorPage'

const ACTIVE_CLASS = MENUBAR_BUTTON_ACTIVE_CLASSNAME.split(' ')[0]

type Listener = (event: Event) => void

class MockClassList {
  private classes = new Set<string>()

  add(...tokens: string[]) {
    tokens.forEach((token) => this.classes.add(token))
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.classes.delete(token))
  }

  has(token: string) {
    return this.classes.has(token)
  }
}

class MockButton {
  public classList = new MockClassList()
  public disabled = false
  public dataset: Record<string, string>
  private listeners = new Map<string, Listener[]>()
  private attributes = new Map<string, string>()

  constructor(command: string | null, dataset: Record<string, string> = {}) {
    this.dataset = { ...dataset }
    if (command) {
      this.dataset.editorCommand = command
    }
  }

  addEventListener(type: string, handler: Listener) {
    const list = this.listeners.get(type) ?? []
    list.push(handler)
    this.listeners.set(type, list)
  }

  removeEventListener(type: string, handler: Listener) {
    const list = this.listeners.get(type)
    if (!list) return
    this.listeners.set(
      type,
      list.filter((entry) => entry !== handler),
    )
  }

  dispatch(type: string, event: Event = new Event(type)) {
    const list = this.listeners.get(type) ?? []
    list.forEach((handler) => handler.call(this, event))
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  getAttribute(name: string) {
    return this.attributes.get(name)
  }

  matches(selector: string): boolean {
    if (!selector) return true
    if (selector === '[data-editor-command]') {
      return typeof this.dataset.editorCommand === 'string'
    }
    if (selector === '[data-editor-image-size]') {
      return typeof this.dataset.editorImageSize === 'string'
    }
    if (selector === '[data-editor-image-align]') {
      return typeof this.dataset.editorImageAlign === 'string'
    }
    if (selector === '[data-editor-image-caption]') {
      return 'editorImageCaption' in this.dataset
    }
    return false
  }
}

class MockInput {
  private listeners = new Map<string, Listener[]>()
  private fileList: File[] = []
  public value = ''

  addEventListener(type: string, handler: Listener) {
    const list = this.listeners.get(type) ?? []
    list.push(handler)
    this.listeners.set(type, list)
  }

  removeEventListener(type: string, handler: Listener) {
    const list = this.listeners.get(type)
    if (!list) return
    this.listeners.set(
      type,
      list.filter((entry) => entry !== handler),
    )
  }

  click = vi.fn()

  get files(): File[] {
    return this.fileList
  }

  setFiles(files: File[]) {
    this.fileList = files
  }

  triggerChange() {
    const handlers = this.listeners.get('change') ?? []
    const event = new Event('change')
    handlers.forEach((handler) => handler.call(this, event))
  }
}

class MockTextInput {
  public value = ''
  public disabled = false
  public dataset: Record<string, string> = {}
  private listeners = new Map<string, Listener[]>()
  private attributes = new Map<string, string>()

  addEventListener(type: string, handler: Listener) {
    const list = this.listeners.get(type) ?? []
    list.push(handler)
    this.listeners.set(type, list)
  }

  removeEventListener(type: string, handler: Listener) {
    const list = this.listeners.get(type)
    if (!list) return
    this.listeners.set(
      type,
      list.filter((entry) => entry !== handler),
    )
  }

  focus = vi.fn()
  blur = vi.fn()

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string) {
    this.attributes.delete(name)
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null
  }

  dispatch(type: string, event: Event = new Event(type)) {
    const handlers = this.listeners.get(type) ?? []
    handlers.forEach((handler) => handler.call(this, event))
  }
}

class MockCounter {
  public textContent = ''
  public dataset: Record<string, string> = {}
}

class MockPanel {
  public hidden = true
  private attributes = new Map<string, string>()

  constructor(
    private readonly nodes: {
      altInput: MockTextInput | null
      altCounter: MockCounter | null
      sizeButtons: MockButton[]
      alignButtons: MockButton[]
      captionButton: MockButton | null
    },
  ) {}

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null
  }

  querySelectorAll(selector?: string) {
    if (!selector) {
      return []
    }
    if (selector === '[data-editor-image-size]') {
      return this.nodes.sizeButtons
    }
    if (selector === '[data-editor-image-align]') {
      return this.nodes.alignButtons
    }
    return []
  }

  querySelector(selector: string) {
    if (selector === '[data-editor-image-caption]') {
      return this.nodes.captionButton
    }
    if (selector === '[data-editor-image-alt]') {
      return this.nodes.altInput
    }
    if (selector === '[data-editor-image-alt-counter]') {
      return this.nodes.altCounter
    }
    return null
  }
}

function createFullEditorDom({
  commands = ['bold', 'italic', 'heading-2', 'heading-3', 'bullet-list', 'ordered-list', 'image'],
  includePanel = true,
  form,
}: {
  commands?: string[]
  includePanel?: boolean
  form?: MockForm | null
} = {}) {
  const toolbarButtons = commands.map((command) => new MockButton(command))
  const toolbar = new MockToolbar(toolbarButtons)

  const fileInput = includePanel ? new MockInput() : null
  const altInput = includePanel ? new MockTextInput() : null
  const altCounter = includePanel ? new MockCounter() : null
  const sizeButtons = includePanel
    ? ['small', 'medium', 'large', 'original'].map(
        (size) => new MockButton(null, { editorImageSize: size }),
      )
    : []
  const alignButtons = includePanel
    ? ['start', 'center', 'end'].map((align) => new MockButton(null, { editorImageAlign: align }))
    : []
  const captionButton = includePanel ? new MockButton(null, { editorImageCaption: '' }) : null
  const panel = includePanel
    ? new MockPanel({ altInput, altCounter, sizeButtons, alignButtons, captionButton })
    : null

  const documentStub = {
    getElementById: vi.fn((id: string) => {
      if (id.endsWith('__toolbar')) return toolbar as any
      if (includePanel && fileInput && id.endsWith('__image-input')) return fileInput as any
      if (includePanel && altInput && id.endsWith('__alt-input')) return altInput as any
      if (includePanel && altCounter && id.endsWith('__counter')) return altCounter as any
      if (includePanel && panel && id.endsWith('__image-panel')) return panel as any
      return null
    }),
  } as unknown as Document

  const root = {
    dataset: {
      editorToolbarId: 'editor_main__toolbar',
      editorImageInputId: includePanel ? 'editor_main__image-input' : undefined,
      editorAltId: includePanel ? 'editor_main__alt-input' : undefined,
      editorImagePanelId: includePanel ? 'editor_main__image-panel' : undefined,
    } satisfies Record<string, string | undefined>,
    ownerDocument: documentStub,
    closest: vi.fn(() => (form ?? null) as unknown as HTMLFormElement | null),
  } as unknown as HTMLElement

  return {
    toolbar,
    panel,
    fileInput,
    altInput,
    altCounter,
    sizeButtons,
    alignButtons,
    captionButton,
    documentStub,
    root,
  }
}

class MockToolbar {
  constructor(private buttons: MockButton[]) {}

  querySelectorAll(selector?: string) {
    if (!selector) {
      return this.buttons
    }
    return this.buttons.filter((button) => button.matches(selector))
  }

  querySelector(selector: string) {
    const matches = this.querySelectorAll(selector)
    return matches.length > 0 ? matches[0] : null
  }

  dispatchEvent = vi.fn()
}

class MockForm {
  public readonly nodeType = 1
  private attrs = new Map<string, string>()

  constructor(initialHxHeaders?: string) {
    if (initialHxHeaders) {
      this.attrs.set('hx-headers', initialHxHeaders)
    }
  }

  setAttribute(name: string, value: string) {
    this.attrs.set(name, value)
  }

  getAttribute(name: string) {
    return this.attrs.has(name) ? this.attrs.get(name)! : null
  }
}

function createEditorStub() {
  const figureNodeType = { name: 'imageFigure' }
  const chain = {
    focus: vi.fn(() => chain),
    toggleBold: vi.fn(() => chain),
    toggleItalic: vi.fn(() => chain),
    toggleHeading: vi.fn(() => chain),
    toggleBulletList: vi.fn(() => chain),
    toggleOrderedList: vi.fn(() => chain),
    setImageFigure: vi.fn(() => chain),
    updateImageFigure: vi.fn(() => chain),
    setTextSelection: vi.fn(() => chain),
    run: vi.fn(() => true),
  }

  const canResult = {
    toggleBold: vi.fn(() => true),
    toggleItalic: vi.fn(() => true),
    toggleHeading: vi.fn(() => true),
    toggleBulletList: vi.fn(() => true),
    toggleOrderedList: vi.fn(() => true),
  }

  const listeners = new Map<string, Set<() => void>>()

  const figureNode = {
    type: figureNodeType,
    attrs: {} as Record<string, unknown>,
    nodeSize: 2,
    content: { size: 0 },
  }

  const selectionContext = { insideFigure: false }

  const selection = {
    node: null as null | { type: { name: string } },
    $from: {
      depth: 1,
      pos: 12,
      node: vi.fn((depth: number) =>
        depth === 1 && selectionContext.insideFigure
          ? (figureNode as unknown as { type: { name: string } })
          : ({ type: { name: 'doc' } } as { type: { name: string } }),
      ),
      before: vi.fn(() => 12),
    },
  }

  const tr = {
    doc: { nodeSize: 2 },
    setSelection: vi.fn(() => tr),
    setMeta: vi.fn(() => tr),
    setNodeMarkup: vi.fn(() => tr),
  }

  const editor = {
    chain: vi.fn(() => chain),
    can: vi.fn(() => canResult),
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({})),
    on: vi.fn((event: string, handler: () => void) => {
      const set = listeners.get(event) ?? new Set<() => void>()
      set.add(handler)
      listeners.set(event, set)
      return editor
    }),
    off: vi.fn((event: string, handler: () => void) => {
      const set = listeners.get(event)
      if (!set) return editor
      set.delete(handler)
      return editor
    }),
    state: {
      schema: {
        nodes: {
          imageFigure: figureNodeType,
        },
      },
      selection,
      tr,
      doc: { nodeSize: 2 },
    },
    view: {
      dispatch: vi.fn(),
      focus: vi.fn(),
      dom: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    },
    commands: {
      focus: vi.fn(() => true),
    },
  }

  return { editor: editor as any, chain, listeners, selection, figureNode, selectionContext, tr }
}

const originalWindow = (globalThis as any).window
const originalFetch = globalThis.fetch
const originalCustomEvent = (globalThis as any).CustomEvent
const originalRequestAnimationFrame = (globalThis as any).requestAnimationFrame
const originalCancelAnimationFrame = (globalThis as any).cancelAnimationFrame

beforeEach(() => {
  resetToolbarForTesting()
  vi.restoreAllMocks()
  ;(globalThis as any).window = {
    confirm: vi.fn(() => true),
    alert: vi.fn(),
  }
  if (typeof CustomEvent === 'undefined') {
    class SimpleCustomEvent<T = any> extends Event {
      detail: T
      constructor(type: string, params?: CustomEventInit<T>) {
        super(type)
        this.detail = (params?.detail ?? null) as T
      }
    }
    ;(globalThis as any).CustomEvent = SimpleCustomEvent
  }
  ;(globalThis as any).requestAnimationFrame = vi.fn((cb: (time: number) => void) => {
    cb(0)
    return 0 as unknown as number
  })
  ;(globalThis as any).cancelAnimationFrame = vi.fn()
})

afterEach(() => {
  resetToolbarForTesting()
  if (originalWindow === undefined) delete (globalThis as any).window
  else (globalThis as any).window = originalWindow
  if (originalFetch) globalThis.fetch = originalFetch
  else delete (globalThis as any).fetch
  if (originalCustomEvent) (globalThis as any).CustomEvent = originalCustomEvent
  if (originalRequestAnimationFrame) {
    ;(globalThis as any).requestAnimationFrame = originalRequestAnimationFrame
  } else {
    delete (globalThis as any).requestAnimationFrame
  }
  if (originalCancelAnimationFrame) {
    ;(globalThis as any).cancelAnimationFrame = originalCancelAnimationFrame
  } else {
    delete (globalThis as any).cancelAnimationFrame
  }
})

describe('editor toolbar client behaviour', () => {
  it('uploads image and inserts figure without triggering failure alert', async () => {
    const form = new MockForm(JSON.stringify({ 'X-CSRF-Token': 'csrf-token' }))
    const { toolbar, fileInput, altInput, root } = createFullEditorDom({ form })
    if (!fileInput || !altInput) throw new Error('setup failed')
    const { editor, chain } = createEditorStub()

    altInput.value = 'Temple entrance'

    const file = new File([new Uint8Array([0xff, 0xd8])], 'photo.png', { type: 'image/png' })
    fileInput.setFiles([file])

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: '/media/images/1.png' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    globalThis.fetch = fetchMock as any

    const bitmap = { width: 800, height: 600, close: vi.fn() }
    const previousCreateImageBitmap = (globalThis as any).createImageBitmap
    ;(globalThis as any).createImageBitmap = vi.fn().mockResolvedValue(bitmap)

    const alertSpy = vi.spyOn((globalThis as any).window, 'alert')

    registerToolbarForEditor(root, editor as any, 'full')
    fileInput.triggerChange()

    await vi.waitFor(() =>
      expect(chain.setImageFigure).toHaveBeenCalledWith({
        src: '/media/images/1.png',
        alt: 'Temple entrance',
        width: 800,
        height: 600,
        size: 'medium',
        align: 'center',
      }),
    )

    expect(alertSpy).not.toHaveBeenCalled()
    expect(toolbar.dispatchEvent).not.toHaveBeenCalled()

    if (previousCreateImageBitmap) {
      ;(globalThis as any).createImageBitmap = previousCreateImageBitmap
    } else {
      delete (globalThis as any).createImageBitmap
    }
  })

  it('alerts once on upload failure and emits error event', async () => {
    const form = new MockForm(JSON.stringify({ 'X-CSRF-Token': 'tok' }))
    const { toolbar, fileInput, root } = createFullEditorDom({ form })
    if (!fileInput) throw new Error('setup failed')
    const { editor } = createEditorStub()

    const file = new File([new Uint8Array([0])], 'photo.png', { type: 'image/png' })
    fileInput.setFiles([file])

    const fetchMock = vi.fn().mockResolvedValue(new Response('fail', { status: 500 }))
    globalThis.fetch = fetchMock as any

    const alertSpy = vi.spyOn((globalThis as any).window, 'alert')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    registerToolbarForEditor(root, editor as any, 'full')
    fileInput.triggerChange()

    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalled()
      expect(toolbar.dispatchEvent).toHaveBeenCalledTimes(1)
      const event = (toolbar.dispatchEvent as any).mock.calls[0][0] as CustomEvent
      expect(event.type).toBe('editor:image-upload-error')
    })
  })

  it('uses CSRF cookie when hx-headers missing', async () => {
    const harness = createFullEditorDom({ form: new MockForm() })
    const { fileInput, root, documentStub } = harness
    if (!fileInput) throw new Error('setup failed')
    const { editor } = createEditorStub()

    const previousDocument = (globalThis as any).document
    ;(globalThis as any).document = documentStub as any
    ;(documentStub as any).cookie = '__Host-csrf=cookie-token'

    try {
      const file = new File([new Uint8Array([0])], 'photo.png', { type: 'image/png' })
      fileInput.setFiles([file])

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ url: '/media/images/3.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      globalThis.fetch = fetchMock as any

      registerToolbarForEditor(root, editor as any, 'full')
      fileInput.triggerChange()

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())

      const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
      const headers =
        requestInit.headers instanceof Headers
          ? requestInit.headers
          : new Headers(requestInit.headers as HeadersInit)
      expect(headers.get('X-CSRF-Token')).toBe('cookie-token')
      expect(headers.get('HX-CSRF-Token')).toBe('cookie-token')
    } finally {
      if (previousDocument) (globalThis as any).document = previousDocument
      else delete (globalThis as any).document
    }
  })

  it('prompts before inserting image without alt text', async () => {
    const form = new MockForm(JSON.stringify({ 'X-CSRF-Token': 'csrfx' }))
    const { fileInput, altInput, root } = createFullEditorDom({ form })
    if (!fileInput || !altInput) throw new Error('setup failed')
    const { editor, chain } = createEditorStub()

    altInput.value = ''

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: '/media/images/2.webp' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    globalThis.fetch = fetchMock as any

    const confirmSpy = vi.spyOn((globalThis as any).window, 'confirm').mockReturnValue(true)

    const file = new File([new Uint8Array([0])], 'photo.webp', { type: 'image/webp' })
    fileInput.setFiles([file])

    registerToolbarForEditor(root, editor as any, 'full')
    fileInput.triggerChange()

    await vi.waitFor(() =>
      expect(chain.setImageFigure).toHaveBeenCalledWith({
        src: '/media/images/2.webp',
        alt: '',
        width: null,
        height: null,
        size: 'medium',
        align: 'center',
      }),
    )
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })

  it('cancels image insert when empty alt confirmation declined', async () => {
    const form = new MockForm(JSON.stringify({ 'X-CSRF-Token': 'csrfx' }))
    const { fileInput, altInput, root } = createFullEditorDom({ form })
    if (!fileInput || !altInput) throw new Error('setup failed')
    const { editor, chain } = createEditorStub()

    altInput.value = ''
    const confirmSpy = vi.spyOn((globalThis as any).window, 'confirm').mockReturnValue(false)

    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as any

    const file = new File([new Uint8Array([0])], 'photo.webp', { type: 'image/webp' })
    fileInput.setFiles([file])

    registerToolbarForEditor(root, editor as any, 'full')
    fileInput.triggerChange()

    await vi.waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
    expect(chain.setImageFigure).not.toHaveBeenCalled()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })

  it('image panel toggles visibility with selection without remount', () => {
    const harness = createFullEditorDom()
    const { panel, altCounter, root, documentStub } = harness
    if (!panel) throw new Error('setup failed')
    const { editor, listeners, figureNode, selectionContext } = createEditorStub()

    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-panel',
      src: '/media/example.png',
    }
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    registerToolbarForEditor(root, editor as any, 'full')
    expect(panel.hidden).toBe(true)
    expect(altCounter?.textContent).toBe('0 / 250')

    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    const callsBefore = documentStub.getElementById.mock.calls.length
    const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
    selectionContext.insideFigure = true
    selectionHandlers.forEach((handler) => handler())
    expect(panel.hidden).toBe(false)
    expect(panel.getAttribute('aria-hidden')).toBe('false')
    expect(altCounter?.textContent).toBe('6 / 250')

    editor.isActive.mockReturnValue(false)
    selectionContext.insideFigure = false
    selectionHandlers.forEach((handler) => handler())
    expect(panel.hidden).toBe(true)
    expect(panel.getAttribute('aria-hidden')).toBe('true')
    expect(altCounter?.textContent).toBe('0 / 250')
    expect(documentStub.getElementById).toHaveBeenCalledTimes(callsBefore)
  })

  it('alt input retains value across toggles and only updates on user input', () => {
    const harness = createFullEditorDom()
    const { panel, altInput, altCounter, root, documentStub } = harness
    if (!panel || !altInput) throw new Error('setup failed')
    const { editor, listeners, figureNode, selectionContext, tr } = createEditorStub()

    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-alt',
      src: '/media/example.png',
    }
    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    const previousDocument = (globalThis as any).document
    let activeElement: unknown = null
    Object.defineProperty(documentStub, 'activeElement', {
      configurable: true,
      get: () => activeElement,
    })
    ;(globalThis as any).document = documentStub as any

    try {
      registerToolbarForEditor(root, editor as any, 'full')
      const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
      selectionContext.insideFigure = true
      selectionHandlers.forEach((handler) => handler())
      expect(panel.hidden).toBe(false)
      expect(altInput.disabled).toBe(false)
      expect(altInput.value).toBe('Temple')
      expect(altCounter?.textContent).toBe('6 / 250')

      activeElement = altInput
      selectionHandlers.forEach((handler) => handler())
      expect(altInput.value).toBe('Temple')

      altInput.value = 'Shrine'
      altInput.dispatch('input')
      expect(tr.setNodeMarkup).toHaveBeenCalled()
      attrs.alt = 'Shrine'
      figureNode.attrs = attrs

      activeElement = null
      editor.isActive.mockReturnValue(false)
      selectionContext.insideFigure = false
      selectionHandlers.forEach((handler) => handler())
      expect(panel.hidden).toBe(true)
      expect(altCounter?.textContent).toBe('0 / 250')

      editor.isActive.mockReturnValue(true)
      selectionContext.insideFigure = true
      selectionHandlers.forEach((handler) => handler())
      expect(altInput.value).toBe('Shrine')
      expect(altCounter?.textContent).toBe('6 / 250')
    } finally {
      if (previousDocument) (globalThis as any).document = previousDocument
      else delete (globalThis as any).document
    }
  })

  it('sanitises alt input, enforces character limit, and surfaces inline feedback', () => {
    const harness = createFullEditorDom()
    const { altInput, altCounter, root } = harness
    if (!altInput || !altCounter) throw new Error('setup failed')
    const { editor, listeners, figureNode, selectionContext, tr } = createEditorStub()

    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-sanitise',
      src: '/media/example.png',
    }
    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    registerToolbarForEditor(root, editor as any, 'full')
    const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
    selectionContext.insideFigure = true
    selectionHandlers.forEach((handler) => handler())

    expect(altInput.value).toBe('Temple')
    expect(altCounter.textContent).toBe('6 / 250')

    const pasteEvent = {
      clipboardData: {
        getData: vi.fn(() => '<em>Temple</em> Gate'),
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent
    altInput.dispatch('paste', pasteEvent)
    expect(pasteEvent.preventDefault).toHaveBeenCalled()
    expect(altInput.value).toBe('Temple Gate')
    expect(altCounter.textContent).toBe('11 / 250')
    expect(tr.setNodeMarkup).toHaveBeenCalled()

    const longValue = 'x'.repeat(260)
    altInput.value = longValue
    altInput.dispatch('input')
    expect(altInput.value.length).toBe(250)
    expect(altInput.dataset.editorAltLimit).toBe('reached')
    expect(altCounter.dataset.editorAltLimit).toBe('reached')

    altInput.value = 'Shrine'
    altInput.dispatch('input')
    expect(altInput.dataset.editorAltLimit).toBeUndefined()
    expect(altCounter.dataset.editorAltLimit).toBe('within')
    expect(altCounter.textContent).toBe('6 / 250')
  })

  it('keeps alt input focused when size or alignment controls are clicked', () => {
    const harness = createFullEditorDom()
    const { altInput, sizeButtons, alignButtons, root } = harness
    if (!altInput) throw new Error('setup failed')
    const { editor, listeners, figureNode, selectionContext, chain } = createEditorStub()

    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-focus',
      src: '/media/example.png',
    }
    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    registerToolbarForEditor(root, editor as any, 'full')
    const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
    selectionContext.insideFigure = true
    selectionHandlers.forEach((handler) => handler())

    altInput.blur.mockClear()
    sizeButtons[0].dispatch('click')
    expect(chain.focus).toHaveBeenCalled()
    expect(chain.updateImageFigure).toHaveBeenCalledWith({ size: 'small' })
    expect(altInput.blur).not.toHaveBeenCalled()

    chain.focus.mockClear()
    chain.updateImageFigure.mockClear()
    alignButtons[0].dispatch('click')
    expect(chain.focus).toHaveBeenCalled()
    expect(chain.updateImageFigure).toHaveBeenCalledWith({ align: 'start' })
    expect(altInput.blur).not.toHaveBeenCalled()
  })

  it('syncs alt input when figure attrs change externally without remounting', () => {
    const harness = createFullEditorDom()
    const { altInput, altCounter, panel, root, documentStub } = harness
    if (!altInput || !panel || !altCounter) throw new Error('setup failed')
    const { editor, listeners, figureNode, selectionContext } = createEditorStub()

    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-sync',
      src: '/media/example.png',
    }
    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    registerToolbarForEditor(root, editor as any, 'full')
    const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
    const updateHandlers = Array.from(listeners.get('update') ?? [])
    const initialCalls = documentStub.getElementById.mock.calls.length
    selectionContext.insideFigure = true
    selectionHandlers.forEach((handler) => handler())
    expect(altInput.value).toBe('Temple')
    expect(panel.hidden).toBe(false)

    attrs.alt = 'Shrine'
    figureNode.attrs = attrs
    updateHandlers.forEach((handler) => handler())
    expect(altInput.value).toBe('Shrine')
    expect(altCounter.textContent).toBe('6 / 250')
    expect(documentStub.getElementById).toHaveBeenCalledTimes(initialCalls)
  })

  it('maintains independent panel state for multiple editors', () => {
    const harnessA = createFullEditorDom()
    const harnessB = createFullEditorDom()

    const { panel: panelA, altCounter: counterA, root: rootA } = harnessA
    const { panel: panelB, altCounter: counterB, root: rootB } = harnessB
    if (!panelA || !panelB || !counterA || !counterB) throw new Error('setup failed')

    const stubA = createEditorStub()
    const stubB = createEditorStub()

    const attrsA: Record<string, unknown> = {
      size: 'medium',
      align: 'start',
      alt: 'Temple A',
      captionId: 'imgcap-a',
      src: '/media/a.png',
    }
    stubA.editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    stubA.editor.getAttributes.mockImplementation(() => attrsA)
    stubA.figureNode.attrs = attrsA

    const attrsB: Record<string, unknown> = {
      size: 'medium',
      align: 'end',
      alt: 'Shrine B',
      captionId: 'imgcap-b',
      src: '/media/b.png',
    }
    stubB.editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    stubB.editor.getAttributes.mockImplementation(() => attrsB)
    stubB.figureNode.attrs = attrsB

    registerToolbarForEditor(rootA, stubA.editor as any, 'full')
    registerToolbarForEditor(rootB, stubB.editor as any, 'full')

    const selectionsA = Array.from(stubA.listeners.get('selectionUpdate') ?? [])
    const selectionsB = Array.from(stubB.listeners.get('selectionUpdate') ?? [])

    stubA.selectionContext.insideFigure = true
    selectionsA.forEach((handler) => handler())
    expect(panelA.hidden).toBe(false)
    expect(counterA.textContent).toBe('8 / 250')
    expect(panelB.hidden).toBe(true)
    expect(counterB.textContent).toBe('0 / 250')

    stubB.selectionContext.insideFigure = true
    selectionsB.forEach((handler) => handler())
    expect(panelB.hidden).toBe(false)
    expect(counterB.textContent).toBe('8 / 250')
    expect(counterA.textContent).toBe('8 / 250')
  })

  it('hides the panel on editor blur and restores it on focus without losing state', () => {
    const harness = createFullEditorDom()
    const { panel, altInput, altCounter, root } = harness
    if (!panel || !altInput || !altCounter) throw new Error('setup failed')
    const { editor, listeners, figureNode, selectionContext } = createEditorStub()

    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-blur',
      src: '/media/example.png',
    }
    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    registerToolbarForEditor(root, editor as any, 'full')
    const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
    const blurHandlers = Array.from(listeners.get('blur') ?? []) as Array<
      (payload: { event?: FocusEvent }) => void
    >
    const focusHandlers = Array.from(listeners.get('focus') ?? [])

    selectionContext.insideFigure = true
    selectionHandlers.forEach((handler) => handler())
    expect(panel.hidden).toBe(false)
    expect(altInput.value).toBe('Temple')
    expect(altCounter.textContent).toBe('6 / 250')

    blurHandlers.forEach((handler) =>
      handler({ event: { relatedTarget: null } as unknown as FocusEvent }),
    )
    expect(panel.hidden).toBe(true)
    expect(altInput.value).toBe('Temple')

    focusHandlers.forEach((handler) => handler())
    expect(panel.hidden).toBe(false)
    expect(altCounter.textContent).toBe('6 / 250')
  })

  it('does not intercept Tab navigation within the panel', () => {
    const harness = createFullEditorDom()
    const { altInput, root } = harness
    if (!altInput) throw new Error('setup failed')
    const { editor, listeners, figureNode, selectionContext } = createEditorStub()

    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-tab',
      src: '/media/example.png',
    }
    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    registerToolbarForEditor(root, editor as any, 'full')
    const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
    selectionContext.insideFigure = true
    selectionHandlers.forEach((handler) => handler())

    const preventDefault = vi.fn()
    altInput.dispatch('keydown', { key: 'Tab', preventDefault } as unknown as KeyboardEvent)
    altInput.dispatch('keydown', {
      key: 'Tab',
      shiftKey: true,
      preventDefault,
    } as unknown as KeyboardEvent)
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('escape from alt input restores node value and returns focus to the editor', () => {
    const harness = createFullEditorDom()
    const { altInput, altCounter, root } = harness
    if (!altInput) throw new Error('setup failed')
    const { editor, listeners, figureNode, selectionContext } = createEditorStub()

    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-escape',
      src: '/media/example.png',
    }
    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    registerToolbarForEditor(root, editor as any, 'full')
    const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
    selectionContext.insideFigure = true
    selectionHandlers.forEach((handler) => handler())

    const pasteEvent = {
      clipboardData: {
        getData: vi.fn(() => '<strong>Temple</strong> Gate'),
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent
    altInput.dispatch('paste', pasteEvent)
    expect(pasteEvent.preventDefault).toHaveBeenCalled()
    expect(altInput.value).toBe('Temple Gate')
    expect(altCounter?.textContent).toBe('11 / 250')

    const preventDefault = vi.fn()
    altInput.value = 'Temple Gate with draft'
    altInput.dispatch('keydown', { key: 'Escape', preventDefault } as unknown as KeyboardEvent)
    expect(preventDefault).toHaveBeenCalled()
    expect(editor.commands.focus).toHaveBeenCalled()
    expect(altInput.blur).toHaveBeenCalled()
    expect(altInput.value).toBe('Temple Gate')
    expect(altCounter?.textContent).toBe('11 / 250')
  })

  it('rapid selection changes debounce panel visibility updates', () => {
    const harness = createFullEditorDom()
    const { panel, root } = harness
    if (!panel) throw new Error('setup failed')
    const { editor, listeners, figureNode, selectionContext } = createEditorStub()
    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-debounce',
      src: '/media/example.png',
    }
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    const rafCallbacks: Array<(time: number) => void> = []
    const previousRAF = (globalThis as any).requestAnimationFrame
    const previousCancelRAF = (globalThis as any).cancelAnimationFrame
    ;(globalThis as any).requestAnimationFrame = vi.fn((cb: (time: number) => void) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length as unknown as number
    })
    ;(globalThis as any).cancelAnimationFrame = vi.fn()

    const setAttributeSpy = vi.spyOn(panel, 'setAttribute')

    try {
      registerToolbarForEditor(root, editor as any, 'full')
      const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
      editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
      selectionContext.insideFigure = true
      selectionHandlers.forEach((handler) => handler())
      editor.isActive.mockReturnValue(false)
      selectionContext.insideFigure = false
      selectionHandlers.forEach((handler) => handler())

      expect(setAttributeSpy).not.toHaveBeenCalled()
      rafCallbacks.forEach((cb) => cb(0))
      expect(setAttributeSpy).not.toHaveBeenCalled()
      expect(panel.hidden).toBe(true)
    } finally {
      setAttributeSpy.mockRestore()
      if (previousRAF) (globalThis as any).requestAnimationFrame = previousRAF
      if (previousCancelRAF) (globalThis as any).cancelAnimationFrame = previousCancelRAF
    }
  })

  it('size and alignment groups reflect attrs and update without node churn', () => {
    const harness = createFullEditorDom()
    const { sizeButtons, alignButtons, root } = harness
    const { editor, listeners, figureNode, selectionContext, chain } = createEditorStub()
    const attrs: Record<string, unknown> = {
      size: 'large',
      align: 'end',
      alt: 'Temple',
      captionId: 'imgcap-size',
      src: '/media/example.png',
    }
    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    registerToolbarForEditor(root, editor as any, 'full')
    const selectionHandlers = Array.from(listeners.get('selectionUpdate') ?? [])
    selectionContext.insideFigure = true
    selectionHandlers.forEach((handler) => handler())

    expect(sizeButtons[2].classList.has(ACTIVE_CLASS)).toBe(true)
    expect(alignButtons[2].classList.has(ACTIVE_CLASS)).toBe(true)

    chain.focus.mockClear()
    chain.updateImageFigure.mockClear()

    sizeButtons[1].dispatch('click')
    alignButtons[0].dispatch('click')

    expect(chain.focus).toHaveBeenCalled()
    expect(chain.updateImageFigure).toHaveBeenNthCalledWith(1, { size: 'medium' })
    expect(chain.updateImageFigure).toHaveBeenNthCalledWith(2, { align: 'start' })
  })

  it('caption focus dispatches selection without altering node attrs', () => {
    const harness = createFullEditorDom()
    const { captionButton, root } = harness
    if (!captionButton) throw new Error('setup failed')
    const { editor, figureNode, selectionContext, tr } = createEditorStub()
    const attrs: Record<string, unknown> = {
      size: 'medium',
      align: 'center',
      alt: 'Temple',
      captionId: 'imgcap-focus',
      src: '/media/example.png',
    }
    editor.isActive.mockImplementation((name: string) => name === 'imageFigure')
    editor.getAttributes.mockImplementation(() => attrs)
    figureNode.attrs = attrs

    const textSelectionSpy = vi.spyOn(TextSelection, 'create').mockReturnValue({} as any)

    registerToolbarForEditor(root, editor as any, 'full')
    selectionContext.insideFigure = true

    captionButton.dispatch('click')

    expect(textSelectionSpy).toHaveBeenCalled()
    expect(editor.view.dispatch).toHaveBeenCalled()
    expect(editor.view.focus).toHaveBeenCalled()
    expect(tr.setNodeMarkup).not.toHaveBeenCalled()

    textSelectionSpy.mockRestore()
  })
})

describe('editor toolbar markup', () => {
  it('renders expected commands and image tooling markup', () => {
    const markup = renderToString(
      <EditorPage
        title="Edit"
        csrfToken="token"
        editors={[{ id: 'editor_main', profile: 'full' }]}
        initialPayloads={{ editor_main: { type: 'doc', content: [] } }}
      />,
    )

    ;['bold', 'italic', 'heading-2', 'heading-3', 'bullet-list', 'ordered-list', 'image'].forEach(
      (command) => {
        expect(markup).toContain(`data-editor-command="${command}"`)
      },
    )
    expect(markup).toContain('data-editor-image-panel')
    expect(markup).toContain('data-editor-image-size="medium"')
    expect(markup).toContain('data-editor-image-align="center"')
    expect(markup).toContain('data-editor-image-caption')
  })
})
