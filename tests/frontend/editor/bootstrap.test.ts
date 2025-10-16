import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

import {
  initEditors,
  registerEditorProfile,
  getMountedEditorsForTesting,
  resetEditorBootstrapForTesting,
} from '../../../src/frontend/editor/bootstrap'
import * as toolbarModule from '../../../src/frontend/editor/toolbar'
import { EDITOR_DATA_ATTRIBUTES } from '../../../src/editor/constants'

const originalDocument = globalThis.document
const originalMutationObserver = globalThis.MutationObserver

const { root: DATA_ATTR_EDITOR_ROOT, profile: DATA_ATTR_EDITOR_PROFILE } = EDITOR_DATA_ATTRIBUTES

class MutationObserverStub {
  static instances: MutationObserverStub[] = []
  public observe = vi.fn()
  public disconnect = vi.fn()

  constructor(public readonly callback: MutationCallback) {
    MutationObserverStub.instances.push(this)
  }
}

beforeAll(() => {
  ;(globalThis as any).MutationObserver = MutationObserverStub as unknown as typeof MutationObserver
})

afterAll(() => {
  ;(globalThis as any).MutationObserver = originalMutationObserver
})

type EventTargetStub = {
  listeners: Map<string, EventListener[]>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  dispatch: (event: string, payload: Event) => void
  target: HTMLElement
}

type DocumentStub = {
  readyState: DocumentReadyState
  querySelectorAll: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  getElementById: ReturnType<typeof vi.fn>
  body: HTMLElement
  documentElement: HTMLElement
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
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
    ({
      nodeType: 1,
      querySelectorAll: vi.fn(() => [] as HTMLElement[]),
    } as unknown as HTMLElement)

  Object.assign(element, {
    addEventListener,
    removeEventListener,
    querySelectorAll: element.querySelectorAll ?? vi.fn(() => [] as HTMLElement[]),
  })

  return { listeners, addEventListener, removeEventListener, dispatch, target: element }
}

const createRoot = (profile?: string) => {
  const element =
    (originalDocument?.createElement?.('div') as HTMLElement | null) ??
    ({
      dataset: {},
      nodeType: 1,
      querySelectorAll: vi.fn(() => [] as HTMLElement[]),
      matches: (selector: string) => selector === DATA_ATTR_EDITOR_ROOT.selector,
    } as unknown as HTMLElement)
  if (typeof element.setAttribute === 'function') {
    element.setAttribute(DATA_ATTR_EDITOR_ROOT.attr, '')
  } else {
    ;(element as any).dataset = {
      ...(element as any).dataset,
      [DATA_ATTR_EDITOR_ROOT.dataset]: '',
    }
  }
  if (profile) {
    ;(element as any).dataset ??= {}
    element.dataset[DATA_ATTR_EDITOR_PROFILE.dataset] = profile
  } else if ((element as any).dataset) {
    delete element.dataset[DATA_ATTR_EDITOR_PROFILE.dataset]
  }
  element.id = element.id || `editor_${Math.random().toString(36).slice(2)}`
  return element
}

const installDocumentStub = (readyState: DocumentReadyState, roots: HTMLElement[] = []) => {
  const listeners = new Map<string, EventListener>()
  const bodyStub = createEventTargetStub()
  const documentElementStub = createEventTargetStub()
  const stub: DocumentStub = {
    readyState,
    querySelectorAll: vi.fn(() => roots),
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      listeners.set(event, handler)
    }),
    removeEventListener: vi.fn((event: string) => {
      listeners.delete(event)
    }),
    getElementById: vi.fn(() => null),
    body: bodyStub.target,
    documentElement: documentElementStub.target,
  }

  Object.defineProperty(globalThis, 'document', {
    value: stub,
    configurable: true,
    writable: true,
  })

  return {
    stub,
    listeners,
    body: bodyStub,
    documentElement: documentElementStub,
    updateRoots(nextRoots: HTMLElement[]) {
      stub.querySelectorAll.mockImplementation(() => nextRoots)
    },
  }
}

describe('initEditors', () => {
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
    documentControls.stub.removeEventListener.mockClear()
    documentControls.stub.getElementById.mockClear()
    documentControls.stub.readyState = 'complete'
    documentControls.body.listeners.clear()
    documentControls.body.addEventListener.mockClear()
    documentControls.body.removeEventListener.mockClear()
    MutationObserverStub.instances = []
  })

  afterEach(() => {
    documentControls.stub.querySelectorAll.mockReset().mockReturnValue([])
    documentControls.stub.getElementById.mockReset()
    documentControls.body.listeners.clear()
    MutationObserverStub.instances = []
  })

  it('initializes editors once per element', async () => {
    const root = createRoot('basic')
    documentControls.updateRoots([root])
    const factory = vi.fn(() => ({
      destroy: vi.fn(),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    }))
    registerEditorProfile('basic', factory)

    initEditors()
    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(1)

    initEditors()
    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('skips setup when no matching elements exist', async () => {
    const factory = vi.fn()
    registerEditorProfile('basic', factory)

    initEditors()
    await flushMicrotasks()

    expect(factory).not.toHaveBeenCalled()
  })

  it('reinitializes editors after htmx swaps', async () => {
    const rootA = createRoot('basic')
    documentControls.updateRoots([rootA])

    const factory = vi.fn(() => ({
      destroy: vi.fn(),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    }))
    registerEditorProfile('basic', factory)

    initEditors()
    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(1)

    const rootB = createRoot('basic')
    documentControls.updateRoots([rootB])

    const afterSwapHandlers = documentControls.body.listeners.get('htmx:afterSwap') ?? []
    expect(afterSwapHandlers.length).toBeGreaterThan(0)
    afterSwapHandlers.forEach((handler) => handler(new Event('htmx:afterSwap')))

    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('defers initialization until DOMContentLoaded when document is loading', async () => {
    const root = createRoot()
    documentControls.updateRoots([root])
    documentControls.stub.readyState = 'loading'

    const factory = vi.fn(() => ({
      destroy: vi.fn(),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    }))
    registerEditorProfile('basic', factory)

    initEditors()
    await flushMicrotasks()
    expect(factory).not.toHaveBeenCalled()

    const listener = documentControls.listeners.get('DOMContentLoaded')
    expect(listener).toBeInstanceOf(Function)
    listener?.(new Event('DOMContentLoaded'))
    await flushMicrotasks()

    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('mounts toolbar exactly once per editor root', async () => {
    const root = createRoot('basic')
    documentControls.updateRoots([root])

    const factory = vi.fn(() => ({
      destroy: vi.fn(),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    }))
    registerEditorProfile('basic', factory)

    const toolbarSpy = vi.spyOn(toolbarModule, 'registerToolbarForEditor')

    initEditors()
    await flushMicrotasks()
    expect(toolbarSpy).toHaveBeenCalledTimes(1)

    initEditors()
    await flushMicrotasks()
    expect(toolbarSpy).toHaveBeenCalledTimes(1)

    toolbarSpy.mockRestore()
    toolbarModule.resetToolbarForTesting()
  })

  it('teardown unregisters toolbar listeners when roots are removed', async () => {
    const root = createRoot('basic')
    documentControls.updateRoots([root])

    const destroy = vi.fn()
    const factory = vi.fn(() => ({
      destroy,
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    }))
    registerEditorProfile('basic', factory)

    const unregisterSpy = vi.spyOn(toolbarModule, 'unregisterToolbarForEditor')

    initEditors()
    await flushMicrotasks()

    const observer = MutationObserverStub.instances[0]
    const record = {
      addedNodes: [] as unknown as NodeListOf<Node>,
      removedNodes: [root] as unknown as NodeListOf<Node>,
    } as unknown as MutationRecord
    observer.callback([record], observer as unknown as MutationObserver)

    await flushMicrotasks()

    expect(unregisterSpy).toHaveBeenCalledWith(root)
    unregisterSpy.mockRestore()
    toolbarModule.resetToolbarForTesting()
  })

  it('destroys editor instances when roots are removed', async () => {
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

  it('registers and cleans up toolbars independently for multiple editors', async () => {
    const rootA = createRoot('basic')
    const rootB = createRoot('basic')
    documentControls.updateRoots([rootA, rootB])

    const destroyA = vi.fn()
    const destroyB = vi.fn()
    let callCount = 0
    const factory = vi.fn(() => {
      callCount += 1
      return {
        destroy: callCount === 1 ? destroyA : destroyB,
        getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
      }
    })
    registerEditorProfile('basic', factory)

    const registerSpy = vi.spyOn(toolbarModule, 'registerToolbarForEditor')
    const unregisterSpy = vi.spyOn(toolbarModule, 'unregisterToolbarForEditor')

    initEditors()
    await flushMicrotasks()

    expect(factory).toHaveBeenCalledTimes(2)
    expect(registerSpy).toHaveBeenCalledTimes(2)
    expect(getMountedEditorsForTesting().has(rootA)).toBe(true)
    expect(getMountedEditorsForTesting().has(rootB)).toBe(true)

    const observer = MutationObserverStub.instances[0]
    const removalRecord = {
      addedNodes: [] as unknown as NodeListOf<Node>,
      removedNodes: [rootA] as unknown as NodeListOf<Node>,
    } as unknown as MutationRecord
    observer.callback([removalRecord], observer as unknown as MutationObserver)
    await flushMicrotasks()

    expect(unregisterSpy).toHaveBeenCalledWith(rootA)
    expect(destroyA).toHaveBeenCalledTimes(1)
    expect(destroyB).not.toHaveBeenCalled()
    expect(getMountedEditorsForTesting().has(rootA)).toBe(false)
    expect(getMountedEditorsForTesting().has(rootB)).toBe(true)

    registerSpy.mockRestore()
    unregisterSpy.mockRestore()
    toolbarModule.resetToolbarForTesting()
  })
})
