// [D3:editor-tiptap.step-14:image-panel] Contextual controls for imageFigure node
import type { EditorInstance } from '../types'
import { IMAGE_PANEL_BUTTON_ACTIVE_TOKENS } from '../styles'
import {
  clampImageFigureWrap,
  findImageFigureSelection,
  normalizeImageFigureAttrs,
  type ImageFigureAlign,
  type ImageFigureSize,
  type ImageFigureWrap,
} from '../extensions/imageFigureShared'

export interface ImagePanelState {
  visible: boolean
  size: ImageFigureSize
  align: ImageFigureAlign
  alt: string
  wrap: ImageFigureWrap
}

// [D3:editor-tiptap.step-14:panel-state] Read current imageFigure attrs from selection
export function getImagePanelState(editor: EditorInstance): ImagePanelState {
  const selectionInfo = findImageFigureSelection(editor.state)
  if (selectionInfo) {
    const attrs = normalizeImageFigureAttrs(selectionInfo.node.attrs)
    return {
      visible: true,
      size: attrs.size,
      align: attrs.align,
      alt: attrs.alt,
      wrap: attrs.wrap,
    }
  }

  return {
    visible: false,
    size: 'm',
    align: 'center',
    alt: '',
    wrap: 'text',
  }
}

// [D3:editor-tiptap.step-14:active-classes] Import active class styles
const ACTIVE_CLASSES = IMAGE_PANEL_BUTTON_ACTIVE_TOKENS

// [D3:editor-tiptap.step-14:update-panel-ui] Update panel UI elements with current state
export function updateImagePanelUI(
  panel: HTMLElement,
  state: ImagePanelState,
  altInput: HTMLInputElement | null,
): void {
  if (state.visible) {
    panel.classList.remove('hidden')
    panel.removeAttribute('hidden')
  } else {
    panel.classList.add('hidden')
    panel.setAttribute('hidden', '')
  }

  // Update size buttons
  const sizeButtons = panel.querySelectorAll<HTMLButtonElement>('[data-size]')
  sizeButtons.forEach((button) => {
    const isActive = button.dataset.size === state.size
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    if (isActive) {
      ACTIVE_CLASSES.forEach((cls) => button.classList.add(cls))
    } else {
      ACTIVE_CLASSES.forEach((cls) => button.classList.remove(cls))
    }
  })

  // Update align buttons
  const alignButtons = panel.querySelectorAll<HTMLButtonElement>('[data-align]')
  alignButtons.forEach((button) => {
    const isActive = button.dataset.align === state.align
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    if (isActive) {
      ACTIVE_CLASSES.forEach((cls) => button.classList.add(cls))
    } else {
      ACTIVE_CLASSES.forEach((cls) => button.classList.remove(cls))
    }
  })

  // Update alt input
  if (altInput && altInput.value !== state.alt) {
    altInput.value = state.alt
  }

  const wrapButtons = panel.querySelectorAll<HTMLButtonElement>('[data-wrap]')
  wrapButtons.forEach((button) => {
    const isActive = button.dataset.wrap === state.wrap
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    if (isActive) {
      ACTIVE_CLASSES.forEach((cls) => button.classList.add(cls))
    } else {
      ACTIVE_CLASSES.forEach((cls) => button.classList.remove(cls))
    }
  })
}

// [D3:editor-tiptap.step-14:attach-handlers] Attach event handlers for panel actions
export function attachImagePanelHandlers(
  panel: HTMLElement,
  editor: EditorInstance,
  altInput: HTMLInputElement | null,
): () => void {
  const handlers: Array<() => void> = []

  // Size button handlers
  const sizeButtons = panel.querySelectorAll<HTMLButtonElement>('[data-size]')
  sizeButtons.forEach((button) => {
    const size = button.dataset.size as 's' | 'm' | 'l' | 'xl' | undefined
    if (!size) return

    const handler = (event: Event) => {
      event.preventDefault()
      const success = editor.chain().focus().setImageSize(size).run()
      if (success) {
        console.log('[ImagePanel] Set size to:', size)
      } else {
        console.warn('[ImagePanel] Failed to set size:', size)
      }
    }

    button.addEventListener('click', handler)
    handlers.push(() => button.removeEventListener('click', handler))
  })

  // Align button handlers
  const alignButtons = panel.querySelectorAll<HTMLButtonElement>('[data-align]')
  alignButtons.forEach((button) => {
    const align = button.dataset.align as 'left' | 'center' | 'right' | undefined
    if (!align) return

    const handler = (event: Event) => {
      event.preventDefault()
      const success = editor.chain().focus().setImageAlign(align).run()
      if (success) {
        console.log('[ImagePanel] Set align to:', align)
      } else {
        console.warn('[ImagePanel] Failed to set align:', align)
      }
    }

    button.addEventListener('click', handler)
    handlers.push(() => button.removeEventListener('click', handler))
  })

  // Alt input handler
  if (altInput) {
    const altHandler = () => {
      const alt = altInput.value.trim()
      editor.chain().focus().updateImageAlt(alt).run()
    }

    altInput.addEventListener('blur', altHandler)
    handlers.push(() => altInput.removeEventListener('blur', altHandler))
  }

  // Update panel on selection changes
  const updatePanel = () => {
    const state = getImagePanelState(editor)
    updateImagePanelUI(panel, state, altInput)
  }

  editor.on('selectionUpdate', updatePanel)
  editor.on('transaction', updatePanel)
  handlers.push(() => editor.off('selectionUpdate', updatePanel))
  handlers.push(() => editor.off('transaction', updatePanel))

  const wrapButtons = panel.querySelectorAll<HTMLButtonElement>('[data-wrap]')
  wrapButtons.forEach((button) => {
    const wrap = button.dataset.wrap as ImagePanelState['wrap'] | undefined
    if (!wrap) return

    const handler = (event: Event) => {
      event.preventDefault()
      editor.chain().focus().setImageWrap(clampImageFigureWrap(wrap)).run()
    }

    button.addEventListener('click', handler)
    handlers.push(() => button.removeEventListener('click', handler))
  })

  // Dismiss on Esc
  const keydownHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      const state = getImagePanelState(editor)
      if (state.visible) {
        editor.commands.focus()
        event.preventDefault()
      }
    }
  }
  document.addEventListener('keydown', keydownHandler)
  handlers.push(() => document.removeEventListener('keydown', keydownHandler))

  // Initial update
  updatePanel()

  return () => handlers.forEach((cleanup) => cleanup())
}
