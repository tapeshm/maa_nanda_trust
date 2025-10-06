import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

import {
  initEditors,
  registerEditorProfile,
  resetEditorBootstrapForTesting,
  getMountedEditorsForTesting,
} from '../../../src/frontend/editor/bootstrap'

const originalDocument = globalThis.document
const originalMutationObserver = globalThis.MutationObserver

class MutationObserverStub {
  static instances: MutationObserverStub[] = []
  public observe = vi.fn()
  public disconnect = vi.fn()

  constructor(public readonly callback: MutationCallback) {
    MutationObserverStub.instances.push(this)
  }
}

type DocumentStub = {
  readyState: DocumentReadyState
  querySelectorAll: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  createElement: typeof originalDocument.createElement
  getElementById: ReturnType<typeof vi.fn>
  body: HTMLElement
  documentElement: HTMLElement
}

type EventTargetStub = {
  listeners: Map<string, EventListener[]>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  dispatch: (event: string, payload: Event) => void
  target: HTMLElement
}

const createEventTargetStub = (): EventTargetStub => {
  const listeners = new Map<string, EventListener[]>()
  const addEventListener = vi.fn((event: string, handler: EventListener) => {
    const existing = listeners.get(event) ?? []
    listeners.set(event, [...existing, handler])
  })
  const removeEventListener = vi.fn((event: string, handler: EventListener) => {
    const existing = listeners.get(event)
    if (!existing) return
    listeners.set(
      event,
      existing.filter((candidate) => candidate !== handler),
    )
  })
  const dispatch = (event: string, payload: Event) => {
    ;(listeners.get(event) ?? []).forEach((handler) => handler(payload))
  }

  const element =
    (originalDocument?.createElement?.('div') as HTMLElement | null) ??
    ({ nodeType: 1, querySelectorAll: vi.fn(() => [] as HTMLElement[]) } as unknown as HTMLElement)
  Object.assign(element, { addEventListener, removeEventListener })

  return { listeners, addEventListener, removeEventListener, dispatch, target: element }
}

const createRoot = (profile?: string) => {
  const element = document.createElement('div')
  element.setAttribute('data-editor', '')
  element.id = `editor_${Math.random().toString(36).slice(2)}`
  if (profile) {
    element.dataset.editorProfile = profile
  } else {
    delete element.dataset.editorProfile
  }
  return element
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const installDocumentStub = (roots: HTMLElement[] = []) => {
  const body = createEventTargetStub()
  const documentElement = createEventTargetStub()
  const fallbackCreateElement = (tag: string) => {
    const element: any = {
      nodeType: 1,
      tagName: tag.toUpperCase(),
      dataset: {},
      querySelectorAll: vi.fn(() => [] as HTMLElement[]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setAttribute(name: string, value: string) {
        if (name.startsWith('data-')) {
          const key = name.slice(5).replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
          element.dataset[key] = value
        }
      },
      getAttribute: vi.fn(() => null),
    }
    return element as HTMLElement
  }

  const stub: DocumentStub = {
    readyState: 'complete',
    querySelectorAll: vi.fn(() => roots),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    createElement:
      (originalDocument?.createElement?.bind(originalDocument) as DocumentStub['createElement']) ??
      fallbackCreateElement,
    getElementById: vi.fn(() => null),
    body: body.target,
    documentElement: documentElement.target,
  }

  Object.defineProperty(globalThis, 'document', {
    value: stub,
    configurable: true,
    writable: true,
  })

  return {
    stub,
    body,
    documentElement,
    updateRoots(next: HTMLElement[]) {
      stub.querySelectorAll.mockImplementation(() => next)
    },
  }
}

describe('editor bootstrap lifecycle', () => {
  let documentControls: ReturnType<typeof installDocumentStub>

  beforeAll(() => {
    documentControls = installDocumentStub()
    ;(globalThis as any).MutationObserver =
      MutationObserverStub as unknown as typeof MutationObserver
  })

  afterAll(() => {
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      configurable: true,
      writable: true,
    })
    ;(globalThis as any).MutationObserver = originalMutationObserver
  })

  beforeEach(() => {
    resetEditorBootstrapForTesting()
    documentControls.stub.querySelectorAll.mockReset().mockReturnValue([])
    documentControls.body.listeners.clear()
    MutationObserverStub.instances = []
  })

  afterEach(() => {
    documentControls.stub.querySelectorAll.mockReset().mockReturnValue([])
    documentControls.body.listeners.clear()
    MutationObserverStub.instances = []
  })

  it('reinitializes editors on htmx swap and cleans up on removal', async () => {
    const rootA = createRoot('basic')
    documentControls.updateRoots([rootA])

    const destroyA = vi.fn()
    const factory = vi.fn(() => ({
      destroy: destroyA,
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    }))
    registerEditorProfile('basic', factory)

    initEditors()
    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(1)

    const beforeCleanupHandlers = documentControls.body.listeners.get('htmx:beforeCleanup') ?? []
    expect(beforeCleanupHandlers.length).toBeGreaterThan(0)
    beforeCleanupHandlers.forEach((handler) =>
      handler(new CustomEvent('htmx:beforeCleanup', { detail: { fragment: rootA } })),
    )

    await flushMicrotasks()
    expect(destroyA).toHaveBeenCalledTimes(1)

    const rootB = createRoot('basic')
    documentControls.updateRoots([rootB])

    const afterSwapHandlers = documentControls.body.listeners.get('htmx:afterSwap') ?? []
    expect(afterSwapHandlers.length).toBeGreaterThan(0)
    afterSwapHandlers.forEach((handler) => handler(new Event('htmx:afterSwap')))

    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(2)
    expect(getMountedEditorsForTesting().has(rootA)).toBe(false)
    expect(getMountedEditorsForTesting().has(rootB)).toBe(true)
  })

  it('destroys editors when roots are removed via MutationObserver', async () => {
    const root = createRoot('basic')
    documentControls.updateRoots([root])

    const destroy = vi.fn()
    const factory = vi.fn(() => ({
      destroy,
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    }))
    registerEditorProfile('basic', factory)

    initEditors()
    await flushMicrotasks()

    expect(MutationObserverStub.instances.length).toBeGreaterThan(0)
    const observer = MutationObserverStub.instances[0]
    const record = {
      addedNodes: [] as unknown as NodeListOf<Node>,
      removedNodes: [root] as unknown as NodeListOf<Node>,
    } as unknown as MutationRecord
    observer.callback([record], observer as unknown as MutationObserver)

    await flushMicrotasks()
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(getMountedEditorsForTesting().has(root)).toBe(false)
  })

  it('does not throw when HTMX is absent', async () => {
    const root = createRoot('basic')
    documentControls.updateRoots([root])
    const factory = vi.fn(() => ({
      destroy: vi.fn(),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    }))
    registerEditorProfile('basic', factory)

    expect(() => initEditors()).not.toThrow()
    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(1)
  })
})
