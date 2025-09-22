import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

import {
  initEditors,
  registerEditorProfile,
  resetEditorBootstrapForTesting,
} from '../../../src/frontend/editor/bootstrap'

const originalDocument = globalThis.document

type DocumentStub = {
  readyState: DocumentReadyState
  querySelectorAll: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const createRoot = (profile?: string) =>
  ({
    dataset: profile ? { editorProfile: profile } : {},
  }) as unknown as HTMLElement

const installDocumentStub = (readyState: DocumentReadyState, roots: HTMLElement[] = []) => {
  const listeners = new Map<string, EventListener>()
  const stub: DocumentStub = {
    readyState,
    querySelectorAll: vi.fn(() => roots),
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      listeners.set(event, handler)
    }),
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
    documentControls.stub.readyState = 'complete'
  })

  afterEach(() => {
    documentControls.stub.querySelectorAll.mockReset().mockReturnValue([])
  })

  it('initializes editors once per element', async () => {
    const root = createRoot('basic')
    documentControls.updateRoots([root])
    const factory = vi.fn(() => ({ destroy: vi.fn() }))
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

  it('defers initialization until DOMContentLoaded when document is loading', async () => {
    const root = createRoot()
    documentControls.updateRoots([root])
    documentControls.stub.readyState = 'loading'

    const factory = vi.fn(() => ({ destroy: vi.fn() }))
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
})
