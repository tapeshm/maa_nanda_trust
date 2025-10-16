import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'

import { FormSync, hasEditorHiddenFields } from '../../../src/frontend/editor/formSync'
import { EDITOR_DATA_ATTRIBUTES } from '../../../src/editor/constants'

const scripts = new Map<string, HTMLScriptElement>()

const originalDocument = globalThis.document
const {
  root: DATA_ATTR_EDITOR_ROOT,
  hiddenJsonField: DATA_ATTR_EDITOR_HIDDEN_JSON,
  hiddenHtmlField: DATA_ATTR_EDITOR_HIDDEN_HTML,
} = EDITOR_DATA_ATTRIBUTES
const EDITOR_SELECTOR = DATA_ATTR_EDITOR_ROOT.selector
const HIDDEN_JSON_SELECTOR = `input[type="hidden"]${DATA_ATTR_EDITOR_HIDDEN_JSON.selector}`
const HIDDEN_HTML_SELECTOR = `input[type="hidden"]${DATA_ATTR_EDITOR_HIDDEN_HTML.selector}`
const HIDDEN_JSON_SELECTOR_PREFIX = `input[type="hidden"][${DATA_ATTR_EDITOR_HIDDEN_JSON.attr}="`
const HIDDEN_HTML_SELECTOR_PREFIX = `input[type="hidden"][${DATA_ATTR_EDITOR_HIDDEN_HTML.attr}="`
const HIDDEN_JSON_PATTERN = new RegExp(`${DATA_ATTR_EDITOR_HIDDEN_JSON.attr}="(.+)"`)
const HIDDEN_HTML_PATTERN = new RegExp(`${DATA_ATTR_EDITOR_HIDDEN_HTML.attr}="(.+)"`)
const DATASET_KEY_EDITOR_HIDDEN_JSON = DATA_ATTR_EDITOR_HIDDEN_JSON.dataset
const DATASET_KEY_EDITOR_HIDDEN_HTML = DATA_ATTR_EDITOR_HIDDEN_HTML.dataset

class MockHiddenInput {
  public type = 'hidden'
  public name = ''
  public value = ''
  public dataset: Record<string, string | undefined> = {}

  constructor(private readonly form: MockForm) {}

  setAttribute(name: string, value: string) {
    if (name === DATA_ATTR_EDITOR_HIDDEN_JSON.attr) {
      this.dataset[DATASET_KEY_EDITOR_HIDDEN_JSON] = value
    }
    if (name === DATA_ATTR_EDITOR_HIDDEN_HTML.attr) {
      this.dataset[DATASET_KEY_EDITOR_HIDDEN_HTML] = value
    }
  }
}

class MockEditor {
  public dataset: Record<string, string> = {}
  constructor(public id: string) {}
}

class MockForm {
  public readonly nodeType = 1
  public isConnected = true
  public readonly ownerDocument = {
    createElement: (tag: string) => {
      if (tag === 'input') {
        return new MockHiddenInput(this) as unknown as HTMLInputElement
      }
      throw new Error(`Unsupported tag: ${tag}`)
    },
  }
  private listeners = new Map<string, EventListener[]>()
  private editors: MockEditor[] = []
  private inputs: MockHiddenInput[] = []

  appendChild(node: unknown) {
    if (node instanceof MockHiddenInput) {
      this.inputs.push(node)
    }
    if (node instanceof MockEditor) {
      this.editors.push(node)
    }
    return node
  }

  addEditor(editor: MockEditor) {
    this.editors.push(editor)
  }

  querySelectorAll(selector: string) {
    if (selector === EDITOR_SELECTOR) {
      return this.editors as unknown as HTMLElement[]
    }
    return []
  }

  querySelector(selector: string) {
    if (selector === HIDDEN_JSON_SELECTOR) {
      return (this.inputs.find((input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_JSON]) ??
        null) as unknown as HTMLInputElement | null
    }
    if (selector.startsWith(HIDDEN_JSON_SELECTOR_PREFIX)) {
      const match = selector.match(HIDDEN_JSON_PATTERN)
      const target = match?.[1]
      if (!target) return null
      return (this.inputs.find(
        (input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_JSON] === target,
      ) ?? null) as unknown as HTMLInputElement | null
    }
    if (selector === HIDDEN_HTML_SELECTOR) {
      return (this.inputs.find((input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_HTML]) ??
        null) as unknown as HTMLInputElement | null
    }
    if (selector.startsWith(HIDDEN_HTML_SELECTOR_PREFIX)) {
      const match = selector.match(HIDDEN_HTML_PATTERN)
      const target = match?.[1]
      if (!target) return null
      return (this.inputs.find(
        (input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_HTML] === target,
      ) ?? null) as unknown as HTMLInputElement | null
    }
    return null
  }

  contains(node: Node): boolean {
    return this.editors.includes(node as unknown as MockEditor)
  }

  addEventListener(type: string, handler: EventListener) {
    const list = this.listeners.get(type) ?? []
    list.push(handler)
    this.listeners.set(type, list)
  }

  removeEventListener(type: string, handler: EventListener) {
    const list = this.listeners.get(type)
    if (!list) return
    this.listeners.set(
      type,
      list.filter((entry) => entry !== handler),
    )
  }

  dispatchEvent(event: Event) {
    const handlers = this.listeners.get(event.type) ?? []
    handlers.forEach((handler) => handler.call(this, event))
    return true
  }

  getHiddenInput(editorId: string) {
    return (
      this.inputs.find((input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_JSON] === editorId) ??
      null
    )
  }

  getHiddenHtmlInput(editorId: string) {
    return (
      this.inputs.find((input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_HTML] === editorId) ??
      null
    )
  }
}

function createEditor(id: string): MockEditor {
  const editor = new MockEditor(id)
  editor.dataset[DATA_ATTR_EDITOR_ROOT.dataset] = ''
  return editor
}

function registerScript(editorId: string, payload: unknown) {
  const script = {
    id: `${editorId}__content`,
    tagName: 'SCRIPT',
    type: 'application/json',
    textContent: JSON.stringify(payload),
  } as HTMLScriptElement
  scripts.set(script.id, script)
}

beforeAll(() => {
  const documentStub = {
    getElementById: (id: string) => scripts.get(id) ?? null,
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
  }
  Object.defineProperty(globalThis, 'document', {
    value: documentStub,
    configurable: true,
    writable: true,
  })
})

afterAll(() => {
  Object.defineProperty(globalThis, 'document', {
    value: originalDocument,
    configurable: true,
    writable: true,
  })
})

describe('FormSync', () => {
  let sync: FormSync

  beforeEach(() => {
    sync = new FormSync()
    scripts.clear()
  })

  afterEach(() => {
    sync.resetForTesting()
    vi.restoreAllMocks()
  })

  it('registers editors/forms and refreshes hidden inputs', () => {
    const form = new MockForm()
    const editor = createEditor('editor_main')
    form.addEditor(editor)

    const initial = { type: 'doc', content: [{ type: 'paragraph' }] }
    const updated = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated' }] }],
    }
    registerScript(editor.id, initial)

    sync.registerFormElement(form as unknown as HTMLFormElement)

    const hiddenField = form.getHiddenInput(editor.id)
    expect(hiddenField).toBeTruthy()
    expect(hiddenField?.value).toBe(JSON.stringify(initial))
    const hiddenHtml = form.getHiddenHtmlInput(editor.id)
    expect(hiddenHtml).toBeTruthy()
    expect(hiddenHtml?.value).toBe('')
    expect(hasEditorHiddenFields(form as unknown as HTMLFormElement)).toBe(true)

    sync.registerEditor(editor as unknown as HTMLElement, {
      destroy() {},
      getJSON: () => updated,
      getHTML: () => '<p>Updated</p>',
    })

    expect(hiddenField?.value).toBe(JSON.stringify(updated))
    expect(hiddenHtml?.value).toBe('<p>Updated</p>')
  })

  it('ensures HTMX parameters include serialized content when hidden inputs exist', () => {
    const form = new MockForm()
    const editor = createEditor('editor_dup')
    form.addEditor(editor)
    registerScript(editor.id, { type: 'doc', content: [] })

    sync.registerFormElement(form as unknown as HTMLFormElement)
    const latest = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Later' }] }],
    }
    sync.registerEditor(editor as unknown as HTMLElement, {
      destroy() {},
      getJSON: () => latest,
      getHTML: () => '<p>Later</p>',
    })

    const paramsEvent = new CustomEvent('htmx:configRequest', {
      detail: {
        parameters: {
          [`content_json[${editor.id}]`]: 'stale',
        },
      },
    })
    form.dispatchEvent(paramsEvent)

    expect(paramsEvent.detail.parameters).toEqual({
      [`content_json[${editor.id}]`]: JSON.stringify(latest),
      [`content_html[${editor.id}]`]: '<p>Later</p>',
    })
    const hiddenField = form.getHiddenInput(editor.id)
    expect(hiddenField?.value).toContain('Later')
    const hiddenHtml = form.getHiddenHtmlInput(editor.id)
    expect(hiddenHtml?.value).toBe('<p>Later</p>')
  })

  it('logs warning once for editor without id', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const form = new MockForm()
    const editor = createEditor('')
    form.addEditor(editor)

    sync.registerFormElement(form as unknown as HTMLFormElement)
    form.dispatchEvent(new Event('submit'))
    form.dispatchEvent(new CustomEvent('htmx:configRequest', { detail: { parameters: {} } }))

    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
