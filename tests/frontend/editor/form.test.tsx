/** @jsxImportSource hono/jsx */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'

import {
  initEditorForms,
  registerEditorContentSource,
  resetEditorFormSyncForTesting,
} from '../../../src/frontend/editor/form'
import { renderToString } from 'hono/jsx/dom/server'
import EditorPage from '../../../src/templates/admin/editorPage'
import { EDITOR_DATA_ATTRIBUTES } from '../../../src/editor/constants'

const originalDocument = globalThis.document
const {
  root: DATA_ATTR_EDITOR_ROOT,
  form: DATA_ATTR_EDITOR_FORM,
  hiddenJsonField: DATA_ATTR_EDITOR_HIDDEN_JSON,
  hiddenHtmlField: DATA_ATTR_EDITOR_HIDDEN_HTML,
} = EDITOR_DATA_ATTRIBUTES
const EDITOR_SELECTOR = DATA_ATTR_EDITOR_ROOT.selector
const FORM_SELECTOR = `form${DATA_ATTR_EDITOR_FORM.selector}`
const HIDDEN_JSON_SELECTOR = `input[type="hidden"]${DATA_ATTR_EDITOR_HIDDEN_JSON.selector}`
const HIDDEN_HTML_SELECTOR = `input[type="hidden"]${DATA_ATTR_EDITOR_HIDDEN_HTML.selector}`
const HIDDEN_JSON_SELECTOR_PREFIX = `input[type="hidden"][${DATA_ATTR_EDITOR_HIDDEN_JSON.attr}="`
const HIDDEN_HTML_SELECTOR_PREFIX = `input[type="hidden"][${DATA_ATTR_EDITOR_HIDDEN_HTML.attr}="`
const HIDDEN_JSON_VALUE_PATTERN = new RegExp(`${DATA_ATTR_EDITOR_HIDDEN_JSON.attr}="(.+)"`)
const HIDDEN_HTML_VALUE_PATTERN = new RegExp(`${DATA_ATTR_EDITOR_HIDDEN_HTML.attr}="(.+)"`)
const DATASET_KEY_EDITOR_HIDDEN_JSON = DATA_ATTR_EDITOR_HIDDEN_JSON.dataset
const DATASET_KEY_EDITOR_HIDDEN_HTML = DATA_ATTR_EDITOR_HIDDEN_HTML.dataset

interface ListenerEntry {
  handler: EventListener
  options?: AddEventListenerOptions | boolean
}

type DocumentStub = {
  querySelectorAll: ReturnType<typeof vi.fn>
  createElement: ReturnType<typeof vi.fn>
  getElementById: ReturnType<typeof vi.fn>
}

type MockInput = HTMLInputElement & {
  value: string
  name: string
  type: string
  dataset: Record<string, string | undefined>
  setAttribute: (key: string, value: string) => void
}

type MockEditor = HTMLElement & {
  id: string
}

class MockForm {
  public listeners = new Map<string, ListenerEntry[]>()
  public inputs: MockInput[] = []

  constructor(
    public ownerDocument: DocumentStub,
    private editors: MockEditor[],
    inputs: MockInput[] = [],
  ) {
    this.inputs = inputs
  }

  querySelectorAll<T extends Element>(selector: string): T[] {
    if (selector === EDITOR_SELECTOR) {
      return this.editors as unknown as T[]
    }
    return []
  }

  querySelector<T extends Element>(selector: string): T | null {
    if (selector.startsWith(HIDDEN_JSON_SELECTOR_PREFIX)) {
      const match = selector.match(HIDDEN_JSON_VALUE_PATTERN)
      const target = match?.[1]
      if (!target) return null
      return (this.inputs.find(
        (input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_JSON] === target,
      ) ?? null) as unknown as T | null
    }
    if (selector === HIDDEN_JSON_SELECTOR) {
      return (this.inputs.find((input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_JSON]) ??
        null) as unknown as T | null
    }
    if (selector.startsWith(HIDDEN_HTML_SELECTOR_PREFIX)) {
      const match = selector.match(HIDDEN_HTML_VALUE_PATTERN)
      const target = match?.[1]
      if (!target) return null
      return (this.inputs.find(
        (input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_HTML] === target,
      ) ?? null) as unknown as T | null
    }
    if (selector === HIDDEN_HTML_SELECTOR) {
      return (this.inputs.find((input) => input.dataset[DATASET_KEY_EDITOR_HIDDEN_HTML]) ??
        null) as unknown as T | null
    }
    return null
  }

  addEventListener(
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions | boolean,
  ): void {
    const existing = this.listeners.get(type) ?? []
    existing.push({ handler, options })
    this.listeners.set(type, existing)
  }

  appendChild(node: Node): Node {
    this.inputs.push(node as MockInput)
    return node
  }

  contains(node: Node): boolean {
    return this.editors.includes(node as MockEditor) || this.inputs.includes(node as MockInput)
  }

  dispatch(type: string, event: Event): void {
    const entries = this.listeners.get(type) ?? []
    entries.forEach(({ handler }) => {
      handler.call(this, event)
    })
  }
}

let documentStub: DocumentStub
let forms: MockForm[]
let idMap: Map<string, HTMLElement>

const createInput = (
  id: string,
  ownerDocument: DocumentStub,
  kind: 'json' | 'html' = 'json',
): MockInput => {
  const input: Partial<MockInput> = {
    type: 'hidden',
    name: kind === 'json' ? `content_json[${id}]` : `content_html[${id}]`,
    value: '',
    dataset: {},
    setAttribute(key: string, value: string) {
      if (key === DATA_ATTR_EDITOR_HIDDEN_JSON.attr) {
        this.dataset![DATASET_KEY_EDITOR_HIDDEN_JSON] = value
      }
      if (key === DATA_ATTR_EDITOR_HIDDEN_HTML.attr) {
        this.dataset![DATASET_KEY_EDITOR_HIDDEN_HTML] = value
      }
    },
  }
  return Object.assign(input, { ownerDocument }) as MockInput
}

const createEditor = (id: string): MockEditor =>
  ({
    id,
    dataset: {},
  }) as unknown as MockEditor

const createScript = (id: string, payload: unknown): HTMLScriptElement =>
  ({
    id: `${id}__content`,
    tagName: 'SCRIPT',
    type: 'application/json',
    textContent: JSON.stringify(payload),
  }) as unknown as HTMLScriptElement

beforeAll(() => {
  idMap = new Map()
  forms = []
  documentStub = {
    querySelectorAll: vi.fn((selector: string) => {
      if (selector === FORM_SELECTOR) {
        return forms as unknown as HTMLFormElement[]
      }
      return []
    }),
    createElement: vi.fn((tag: string) => {
      if (tag === 'input') {
        // `createElement` requires the caller to supply the owner document; fallback to stub
        return createInput('dynamic', documentStub)
      }
      throw new Error(`Unsupported tag ${tag}`)
    }),
    getElementById: vi.fn((id: string) => idMap.get(id) ?? null),
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

beforeEach(() => {
  forms.splice(0, forms.length)
  idMap.clear()
  documentStub.querySelectorAll.mockClear()
  documentStub.createElement.mockClear()
  documentStub.getElementById.mockClear()
  resetEditorFormSyncForTesting()
})

afterEach(() => {
  forms.splice(0, forms.length)
  idMap.clear()
})

describe('editor form serialization', () => {
  it('serializes editor state into hidden input before submit', () => {
    const editor = createEditor('editor_main')
    const initial = { type: 'doc', content: [{ type: 'paragraph' }] }
    const updated = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated' }] }],
    }
    const script = createScript(editor.id, initial)
    idMap.set(script.id, script as unknown as HTMLElement)

    const jsonInput = createInput(editor.id, documentStub, 'json')
    jsonInput.dataset[DATASET_KEY_EDITOR_HIDDEN_JSON] = editor.id
    const htmlInput = createInput(editor.id, documentStub, 'html')
    htmlInput.dataset[DATASET_KEY_EDITOR_HIDDEN_HTML] = editor.id

    const form = new MockForm(documentStub, [editor], [jsonInput, htmlInput])
    forms.push(form)

    let current = initial
    registerEditorContentSource(editor as unknown as HTMLElement, {
      destroy() {},
      getJSON: () => current,
      getHTML: () => `<p>${current === initial ? '' : 'Updated'}</p>`,
    })

    initEditorForms()

    // Simulate user edit then form submission
    current = updated
    form.dispatch('submit', new Event('submit'))

    expect(jsonInput.value).toBe(JSON.stringify(updated))
    expect(htmlInput.value).toBe('<p>Updated</p>')
  })

  it('ignores forms with no registered editor', () => {
    const form = new MockForm(documentStub, [], [])
    forms.push(form)

    expect(() => initEditorForms()).not.toThrow()
    expect(() => form.dispatch('submit', new Event('submit'))).not.toThrow()
  })

  it('warns once when an editor root lacks an id', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const editor = createEditor('editor_missing')
    editor.id = ''

    const form = new MockForm(documentStub, [editor], [])
    forms.push(form)

    registerEditorContentSource(editor as unknown as HTMLElement, {
      destroy() {},
      getJSON: () => ({ type: 'doc', content: [{ type: 'paragraph' }] }),
    })

    initEditorForms()
    form.dispatch('submit', new Event('submit'))

    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })

  it('renders hx-headers with X-CSRF-Token in the admin template', () => {
    const token = 'token-abc'
    const markup = renderToString(
      <EditorPage
        title="Edit"
        csrfToken={token}
        editors={[{ id: 'editor_main', profile: 'basic' }]}
        initialPayloads={{ editor_main: { type: 'doc', content: [] } }}
        nonce="nonce"
      />,
    )

    const expectedHeaders = JSON.stringify({ 'X-CSRF-Token': token })
    expect(markup).toMatch(/hx-headers=("[^"]*"|'[^']*')/)
    expect(markup).toContain(expectedHeaders)
    expect(markup).not.toContain('document.cookie')
  })

  it('serializes multiple editors to distinct content_json fields deterministically', () => {
    const editorA = createEditor('editor_a')
    const editorB = createEditor('editor_b')

    const scriptA = createScript(editorA.id, { type: 'doc', content: [] })
    const scriptB = createScript(editorB.id, { type: 'doc', content: [] })
    idMap.set(scriptA.id, scriptA as unknown as HTMLElement)
    idMap.set(scriptB.id, scriptB as unknown as HTMLElement)

    const inputA = createInput(editorA.id, documentStub, 'json')
    inputA.dataset[DATASET_KEY_EDITOR_HIDDEN_JSON] = editorA.id
    const inputB = createInput(editorB.id, documentStub, 'json')
    inputB.dataset[DATASET_KEY_EDITOR_HIDDEN_JSON] = editorB.id
    const htmlInputA = createInput(editorA.id, documentStub, 'html')
    htmlInputA.dataset[DATASET_KEY_EDITOR_HIDDEN_HTML] = editorA.id
    const htmlInputB = createInput(editorB.id, documentStub, 'html')
    htmlInputB.dataset[DATASET_KEY_EDITOR_HIDDEN_HTML] = editorB.id

    const form = new MockForm(
      documentStub,
      [editorA, editorB],
      [inputA, inputB, htmlInputA, htmlInputB],
    )
    forms.push(form)

    let stateA = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
    }
    let stateB = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
    }

    registerEditorContentSource(editorA as unknown as HTMLElement, {
      destroy() {},
      getJSON: () => stateA,
      getHTML: () => `<p>${(stateA.content?.[0] as any)?.content?.[0]?.text ?? ''}</p>`,
    })
    registerEditorContentSource(editorB as unknown as HTMLElement, {
      destroy() {},
      getJSON: () => stateB,
      getHTML: () => `<p>${(stateB.content?.[0] as any)?.content?.[0]?.text ?? ''}</p>`,
    })

    initEditorForms()

    stateA = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A*' }] }],
    }
    stateB = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B*' }] }],
    }

    form.dispatch('submit', new Event('submit'))

    expect(inputA.value).toBe(JSON.stringify(stateA))
    expect(inputB.value).toBe(JSON.stringify(stateB))
    expect(htmlInputA.value).toBe('<p>A*</p>')
    expect(htmlInputB.value).toBe('<p>B*</p>')

    const parameters = {
      [`content_json[${editorA.id}]`]: 'stale-a',
      [`content_json[${editorB.id}]`]: 'stale-b',
      [`content_html[${editorA.id}]`]: 'stale-html-a',
      [`content_html[${editorB.id}]`]: 'stale-html-b',
    }
    const parametersEvent = {
      detail: { parameters },
    } as unknown as Event
    ;(parametersEvent as any).currentTarget = form
    form.dispatch('htmx:configRequest', parametersEvent)

    expect(parameters[`content_json[${editorA.id}]`]).toBe(JSON.stringify(stateA))
    expect(parameters[`content_json[${editorB.id}]`]).toBe(JSON.stringify(stateB))
    expect(parameters[`content_html[${editorA.id}]`]).toBe('<p>A*</p>')
    expect(parameters[`content_html[${editorB.id}]`]).toBe('<p>B*</p>')
  })
})
