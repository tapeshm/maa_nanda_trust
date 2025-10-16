import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

import {
  initEditors,
  registerEditorProfile,
  resetEditorBootstrapForTesting,
} from '../../../src/frontend/editor/bootstrap'
import { EDITOR_DATA_ATTRIBUTES } from '../../../src/editor/constants'

type DocumentStub = {
  readyState: DocumentReadyState
  querySelectorAll: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  getElementById: ReturnType<typeof vi.fn>
}

const originalDocument = globalThis.document
const { profile: DATA_ATTR_EDITOR_PROFILE } = EDITOR_DATA_ATTRIBUTES
const DATASET_KEY_EDITOR_PROFILE = DATA_ATTR_EDITOR_PROFILE.dataset

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const createRoot = (id: string, profile?: string) =>
  ({
    id,
    dataset: profile ? { [DATASET_KEY_EDITOR_PROFILE]: profile } : ({} as Record<string, string>),
  }) as unknown as HTMLElement

const createPayloadScript = (json: unknown) =>
  ({
    tagName: 'SCRIPT',
    type: 'application/json',
    textContent: JSON.stringify(json),
  }) as unknown as HTMLScriptElement

const installDocumentStub = (readyState: DocumentReadyState, roots: HTMLElement[] = []) => {
  const listeners = new Map<string, EventListener>()
  const idMap = new Map<string, HTMLElement | null>()
  const stub: DocumentStub = {
    readyState,
    querySelectorAll: vi.fn(() => roots),
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      listeners.set(event, handler)
    }),
    getElementById: vi.fn((id: string) => idMap.get(id) ?? null),
  }

  Object.defineProperty(globalThis, 'document', {
    value: stub,
    configurable: true,
    writable: true,
  })

  return {
    stub,
    listeners,
    updateRoots(nextRoots: HTMLElement[]) {
      stub.querySelectorAll.mockImplementation(() => nextRoots)
    },
    setId(id: string, el: HTMLElement | null) {
      idMap.set(id, el)
    },
  }
}

describe('editor content hydration', () => {
  let documentControls: ReturnType<typeof installDocumentStub>

  beforeAll(() => {
    documentControls = installDocumentStub('complete')
  })

  afterAll(() => {
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      configurable: true,
      writable: true,
    })
  })

  beforeEach(() => {
    resetEditorBootstrapForTesting()
    documentControls.stub.querySelectorAll.mockReset().mockReturnValue([])
    documentControls.stub.addEventListener.mockClear()
    documentControls.stub.getElementById.mockClear()
    documentControls.stub.readyState = 'complete'
  })

  afterEach(() => {
    documentControls.stub.querySelectorAll.mockReset().mockReturnValue([])
  })

  it('hydrates editor with valid JSON payload', async () => {
    const root = createRoot('article', 'basic')
    const payload = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    }
    const script = createPayloadScript(payload)

    documentControls.updateRoots([root])
    documentControls.setId('article__content', script as unknown as HTMLElement)

    const seen: unknown[] = []
    registerEditorProfile('basic', async (_root, ctx) => {
      seen.push(ctx.initialContent)
      return {
        destroy() {},
        getJSON: () => ctx.initialContent,
      }
    })

    initEditors()
    await flushMicrotasks()

    expect(seen).toHaveLength(1)
    expect(seen[0]).toEqual(payload)
  })

  it('falls back to default content when JSON missing or invalid', async () => {
    const root = createRoot('missing', 'basic')
    documentControls.updateRoots([root])
    documentControls.setId('missing__content', null)

    let contentA: unknown
    registerEditorProfile('basic', async (_root, ctx) => {
      contentA = ctx.initialContent
      return {
        destroy() {},
        getJSON: () => ctx.initialContent,
      }
    })

    initEditors()
    await flushMicrotasks()

    expect((contentA as any)?.type).toBe('doc')
    expect(Array.isArray((contentA as any)?.content)).toBe(true)

    // Now simulate invalid JSON payload
    const root2 = createRoot('invalid', 'basic')
    const invalidScript = {
      tagName: 'SCRIPT',
      type: 'application/json',
      textContent: '{"type":"bad"}',
    } as unknown as HTMLScriptElement
    documentControls.updateRoots([root2])
    documentControls.setId('invalid__content', invalidScript as unknown as HTMLElement)

    let contentB: unknown
    registerEditorProfile('basic', async (_root, ctx) => {
      contentB = ctx.initialContent
      return {
        destroy() {},
        getJSON: () => ctx.initialContent,
      }
    })

    initEditors()
    await flushMicrotasks()

    expect((contentB as any)?.type).toBe('doc')
    expect(Array.isArray((contentB as any)?.content)).toBe(true)
  })
})
