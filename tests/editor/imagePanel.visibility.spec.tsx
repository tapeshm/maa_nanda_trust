import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getImagePanelState, updateImagePanelUI } from '../../src/frontend/editor/ui/ImagePanel'
const originalDocument: any = (globalThis as any).document

function makePMNode(typeName: string, attrs: any = {}) {
  return { type: { name: typeName }, attrs }
}

function makeStateWithSelection(nodeType: string, attrs?: any) {
  const node = makePMNode(nodeType, attrs)
  const $from = {
    depth: 0,
    node: () => node,
    before: () => 0,
  }
  return { selection: { $from } } as any
}

function makePanelDom() {
  const classSet = new Set<string>(['hidden'])
  const attributes = new Map<string, string>()
  attributes.set('hidden', '')

  const sizes = ['s', 'm', 'l', 'xl'] as const
  const aligns = ['left', 'center', 'right'] as const
  const wraps = ['text', 'break'] as const

  type Btn = HTMLButtonElement & {
    dataset: Record<string, string>
    attributes: Map<string, string>
  }
  const makeBtn = (dataset: Record<string, string>): Btn => ({
    dataset,
    attributes: new Map<string, string>(),
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value)
    },
    classList: {
      add: (v: string) => classSet.add(v),
      remove: (v: string) => classSet.delete(v),
      contains: (v: string) => classSet.has(v),
    },
  } as any)

  const sizeButtons = sizes.map((s) => makeBtn({ size: s }))
  const alignButtons = aligns.map((a) => makeBtn({ align: a }))
  const wrapButtons = wraps.map((w) => makeBtn({ wrap: w }))

  const panel = {
    classList: {
      add: (v: string) => classSet.add(v),
      remove: (v: string) => classSet.delete(v),
      contains: (v: string) => classSet.has(v),
    },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    hasAttribute: (name: string) => attributes.has(name),
    querySelectorAll: (selector: string) => {
      if (selector === '[data-size]') return sizeButtons as any
      if (selector === '[data-align]') return alignButtons as any
      if (selector === '[data-wrap]') return wrapButtons as any
      return []
    },
  } as any as HTMLElement & {
    hasAttribute: (name: string) => boolean
  }

  const alt = { value: '', type: 'text' } as any as HTMLInputElement
  return { panel, alt, sizeButtons, alignButtons, wrapButtons, attributes, classSet }
}

describe('ImagePanel visibility and UI state', () => {
  beforeEach(() => {
    ;(globalThis as any).document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })
  afterEach(() => {
    ;(globalThis as any).document = originalDocument
  })
  it('visible=true when selection is on imageFigure; buttons reflect attrs', () => {
    const editor = { state: makeStateWithSelection('imageFigure', { size: 'l', align: 'right', alt: 'Banner', wrap: 'break' }) } as any
    const state = getImagePanelState(editor)
    expect(state.visible).toBe(true)
    expect(state.size).toBe('l')
    expect(state.align).toBe('right')
    expect(state.wrap).toBe('break')

    const { panel, alt, sizeButtons, alignButtons, wrapButtons } = makePanelDom()
    updateImagePanelUI(panel, state, alt)

    // Hidden removed
    expect(panel.classList.contains('hidden')).toBe(false)
    expect(panel.hasAttribute('hidden')).toBe(false)

    // aria-pressed reflects active controls via setAttribute on stubs
    const sizeL = sizeButtons.find((b) => b.dataset.size === 'l')!
    expect(sizeL.attributes.get('aria-pressed')).toBe('true')
    const alignRight = alignButtons.find((b) => b.dataset.align === 'right')!
    expect(alignRight.attributes.get('aria-pressed')).toBe('true')
    const wrapBreak = wrapButtons.find((b) => (b as any).dataset.wrap === 'break')!
    expect(wrapBreak.attributes.get('aria-pressed')).toBe('true')

    // Alt input value synced
    expect(alt.value).toBe('Banner')
  })

  it('visible=false when selection not on imageFigure; panel hidden', () => {
    const editor = { state: makeStateWithSelection('paragraph') } as any
    const state = getImagePanelState(editor)
    expect(state.visible).toBe(false)

    const { panel, alt, attributes, classSet } = makePanelDom()
    updateImagePanelUI(panel, state, alt)
    expect(classSet.has('hidden')).toBe(true)
    expect(attributes.get('hidden')).toBe('')
  })
})
