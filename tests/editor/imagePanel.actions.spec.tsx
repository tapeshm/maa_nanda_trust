import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { attachImagePanelHandlers } from '../../src/frontend/editor/ui/ImagePanel'
const originalDocument: any = (globalThis as any).document

type Listener = (ev: Event) => void

function makeButtonStub(attr: string, value: string) {
  const listeners = new Map<string, Listener[]>()
  const dataset: Record<string, string> = { [attr]: value }
  return {
    dataset,
    attributes: new Map<string, string>(),
    setAttribute(name: string, value: string) {
      ;(this as any).attributes.set(name, value)
    },
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(() => false),
    },
    addEventListener: (type: string, handler: Listener) => {
      const arr = listeners.get(type) ?? []
      arr.push(handler)
      listeners.set(type, arr)
    },
    removeEventListener: (type: string, handler: Listener) => {
      const arr = listeners.get(type) ?? []
      listeners.set(
        type,
        arr.filter((h) => h !== handler),
      )
    },
    click() {
      ;(listeners.get('click') ?? []).forEach((h) => h(new Event('click')))
    },
  } as any as HTMLButtonElement & { click: () => void }
}

function makePanel() {
  const sizeBtn = makeButtonStub('size', 'm')
  const alignBtn = makeButtonStub('align', 'center')
  const wrapBtn = makeButtonStub('wrap', 'break')
  const classSet = new Set<string>(['hidden'])
  const attributes = new Map<string, string>([['hidden', '']])

  return {
    classList: {
      add: (v: string) => classSet.add(v),
      remove: (v: string) => classSet.delete(v),
      contains: (v: string) => classSet.has(v),
    },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    querySelectorAll: (selector: string) => {
      if (selector === '[data-size]') return [sizeBtn] as any
      if (selector === '[data-align]') return [alignBtn] as any
      if (selector === '[data-wrap]') return [wrapBtn] as any
      return []
    },
  } as any as HTMLElement
}

describe('ImagePanel action handlers', () => {
  beforeEach(() => {
    ;(globalThis as any).document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })
  afterEach(() => {
    ;(globalThis as any).document = originalDocument
  })
  it('invokes editor commands for size/align/wrap and updates alt on blur', () => {
    const sizeRun = vi.fn(() => true)
    const alignRun = vi.fn(() => true)
    const wrapRun = vi.fn(() => true)
    const updateAltRun = vi.fn(() => true)

    const chain: any = {
      focus: () => chain,
      setImageSize: (_s: string) => ({ run: sizeRun }),
      setImageAlign: (_a: string) => ({ run: alignRun }),
      setImageWrap: (_w: string) => ({ run: wrapRun }),
      updateImageAlt: (_alt: string) => ({ run: updateAltRun }),
      run: () => true,
    }

    const listeners = new Map<string, Set<(...args: any[]) => void>>()
    const editor: any = {
      chain: () => chain,
      on: (evt: string, handler: any) => {
        const set = listeners.get(evt) ?? new Set()
        set.add(handler)
        listeners.set(evt, set)
      },
      off: (evt: string, handler: any) => listeners.get(evt)?.delete(handler),
      state: { selection: { $from: { depth: 0, node: () => ({ type: { name: 'imageFigure' }, attrs: { alt: '' } }), before: () => 0 } } },
      commands: { focus: vi.fn() },
    }

    const panel = makePanel()
    const altListeners = new Map<string, Listener[]>()
    const alt = {
      value: 'Banner Alt',
      addEventListener: (type: string, handler: Listener) => {
        const arr = altListeners.get(type) ?? []
        arr.push(handler)
        altListeners.set(type, arr)
      },
      removeEventListener: (type: string, handler: Listener) => {
        const arr = altListeners.get(type) ?? []
        altListeners.set(
          type,
          arr.filter((h) => h !== handler),
        )
      },
      dispatchEvent: (ev: Event) => {
        ;(altListeners.get(ev.type) ?? []).forEach((h) => h(ev))
        return true
      },
    } as any as HTMLInputElement

    const detach = attachImagePanelHandlers(panel, editor, alt)

    // Click handlers
    const [sizeBtn, alignBtn, wrapBtn] = [
      ...(panel.querySelectorAll('[data-size]') as any),
      ...(panel.querySelectorAll('[data-align]') as any),
      ...(panel.querySelectorAll('[data-wrap]') as any),
    ] as any
    sizeBtn!.click()
    alignBtn!.click()
    wrapBtn!.click()

    expect(sizeRun).toHaveBeenCalled()
    expect(alignRun).toHaveBeenCalled()
    expect(wrapRun).toHaveBeenCalled()

    // Alt blur should update alt
    // Call blur handler by invoking updateImageAlt via chain
    alt.dispatchEvent?.(new Event('blur'))
    expect(updateAltRun).toHaveBeenCalled()

    detach()
  })
})
